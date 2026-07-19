"use server";

import { prisma } from "@/lib/db";
import { parseAmount, computeHourlyPrice, computeWasteTotal } from "@/lib/money";
import { fromDateInput, startOfDay, endOfDay, toStoredDay } from "@/lib/dates";
import { PricingType, Recurrence } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function nextSortOrder(date: Date, crewId: number | null): Promise<number> {
  const last = await prisma.scheduledJob.findFirst({
    where: {
      date: { gte: startOfDay(date), lte: endOfDay(date) },
      crewId: crewId ?? undefined,
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

function readExtras(formData: FormData): {
  wasteBags: number | null;
  wasteBagPrice: number | null;
  wasteTotal: number;
  materialsCharge: number | null;
  materialsPaid: number | null;
  materialsNote: string;
  materialsChargeTotal: number;
} {
  const wasteBags = Math.max(0, Math.round(parseAmount(formData.get("wasteBags"))));
  const wasteBagPrice = parseAmount(formData.get("wasteBagPrice"));
  const hasWaste = wasteBags > 0 && wasteBagPrice > 0;
  const wasteTotal = hasWaste ? computeWasteTotal(wasteBags, wasteBagPrice) : 0;

  // Accept legacy field name from older forms.
  const chargeRaw = parseAmount(
    formData.get("materialsCharge") ?? formData.get("materialsCost")
  );
  const paidRaw = parseAmount(formData.get("materialsPaid"));
  const materialsNote = String(formData.get("materialsNote") || "").trim();
  const hasMaterials = chargeRaw > 0 || paidRaw > 0;
  const materialsChargeTotal = chargeRaw > 0 ? Math.round(chargeRaw * 100) / 100 : 0;
  const materialsPaidTotal = paidRaw > 0 ? Math.round(paidRaw * 100) / 100 : 0;

  return {
    wasteBags: hasWaste ? wasteBags : null,
    wasteBagPrice: hasWaste ? wasteBagPrice : null,
    wasteTotal,
    materialsCharge: hasMaterials && materialsChargeTotal > 0 ? materialsChargeTotal : null,
    materialsPaid: hasMaterials && materialsPaidTotal > 0 ? materialsPaidTotal : null,
    materialsNote: hasMaterials ? materialsNote : "",
    materialsChargeTotal,
  };
}

function readJobPrice(formData: FormData): {
  price: number;
  basePrice: number;
  pricingType: PricingType;
  hourlyRate: number | null;
  hours: number | null;
  workers: number | null;
  wasteBags: number | null;
  wasteBagPrice: number | null;
  materialsCharge: number | null;
  materialsPaid: number | null;
  materialsNote: string;
} {
  const pricingType = (
    String(formData.get("pricingType") || "FIXED") === "HOURLY" ? "HOURLY" : "FIXED"
  ) as PricingType;

  const extras = readExtras(formData);
  const addOns = extras.wasteTotal + extras.materialsChargeTotal;

  if (pricingType === "HOURLY") {
    const workers = Math.max(1, Math.round(parseAmount(formData.get("workers")) || 1));
    const hourlyRate = parseAmount(formData.get("hourlyRate"));
    const hours = parseAmount(formData.get("hours"));
    const basePrice = computeHourlyPrice(workers, hourlyRate, hours);
    return {
      price: basePrice + addOns,
      basePrice,
      pricingType,
      hourlyRate,
      hours,
      workers,
      wasteBags: extras.wasteBags,
      wasteBagPrice: extras.wasteBagPrice,
      materialsCharge: extras.materialsCharge,
      materialsPaid: extras.materialsPaid,
      materialsNote: extras.materialsNote,
    };
  }

  const basePrice = parseAmount(formData.get("price"));
  return {
    price: basePrice + addOns,
    basePrice,
    pricingType: "FIXED",
    hourlyRate: null,
    hours: null,
    workers: null,
    wasteBags: extras.wasteBags,
    wasteBagPrice: extras.wasteBagPrice,
    materialsCharge: extras.materialsCharge,
    materialsPaid: extras.materialsPaid,
    materialsNote: extras.materialsNote,
  };
}

/**
 * Calendar-first job creation. The customer list builds itself: type a name and
 * if it's new we create the customer behind the scenes. An optional repeat turns
 * the customer into a recurring round from this date.
 */
export async function createJobFromCalendar(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const date = dateStr ? fromDateInput(dateStr) : startOfDay(new Date());
  const crewIdRaw = formData.get("crewId");
  const crewId = crewIdRaw ? Number(crewIdRaw) : null;
  const customerName = String(formData.get("customerName") || "").trim();
  const customerAddress = String(formData.get("customerAddress") || "").trim();
  const what = String(formData.get("title") || "").trim();
  const repeat = String(formData.get("repeat") || "NONE") as Recurrence;
  const pricing = readJobPrice(formData);
  // Seed recurring-round defaults from the base price only — waste/materials are
  // one-off, per-visit extras and shouldn't stick to the customer's usual price.
  const { basePrice: price } = pricing;

  let customerId: number | null = null;
  if (customerName) {
    let customer = await prisma.customer.findFirst({
      where: { name: customerName },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          address: customerAddress,
          defaultPrice: price || null,
          defaultCrewId: crewId,
          recurrence: repeat,
          recurrenceAnchor: repeat !== "NONE" ? toStoredDay(date) : null,
        },
      });
    } else {
      const updates: {
        recurrence?: Recurrence;
        recurrenceAnchor?: Date;
        defaultPrice?: number | null;
        defaultCrewId?: number | null;
        address?: string;
      } = {};

      if (customerAddress) updates.address = customerAddress;

      if (repeat !== "NONE" && customer.recurrence === "NONE") {
        updates.recurrence = repeat;
        updates.recurrenceAnchor = toStoredDay(date);
        updates.defaultPrice = customer.defaultPrice ?? (price || null);
        updates.defaultCrewId = customer.defaultCrewId ?? crewId;
      }

      if (Object.keys(updates).length > 0) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: updates,
        });
      }
    }
    customerId = customer.id;

    // If this date was previously deleted from the round, clear that exception.
    if (repeat !== "NONE") {
      await prisma.scheduleException
        .delete({
          where: {
            customerId_date: { customerId, date: toStoredDay(date) },
          },
        })
        .catch(() => {});
    }
  }

  const title = what || customerName || "Job";

  await prisma.scheduledJob.create({
    data: {
      date: toStoredDay(date),
      title,
      price: pricing.price,
      pricingType: pricing.pricingType,
      hourlyRate: pricing.hourlyRate,
      hours: pricing.hours,
      workers: pricing.workers,
      wasteBags: pricing.wasteBags,
      wasteBagPrice: pricing.wasteBagPrice,
      materialsCharge: pricing.materialsCharge,
      materialsPaid: pricing.materialsPaid,
      materialsNote: pricing.materialsNote,
      crewId: crewId || undefined,
      customerId: customerId || undefined,
      recurringSourceCustomerId:
        repeat !== "NONE" && customerId ? customerId : null,
      sortOrder: await nextSortOrder(date, crewId),
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/customers");
  revalidatePath("/");
}

export async function createQuickJob(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const date = dateStr ? fromDateInput(dateStr) : startOfDay(new Date());
  const crewIdRaw = formData.get("crewId");
  const crewId = crewIdRaw ? Number(crewIdRaw) : null;
  const customerIdRaw = formData.get("customerId");
  const customerId = customerIdRaw ? Number(customerIdRaw) : null;
  const title = String(formData.get("title") || "").trim() || "Job";

  await prisma.scheduledJob.create({
    data: {
      date: toStoredDay(date),
      title,
      price: parseAmount(formData.get("price")),
      crewId: crewId || undefined,
      customerId: customerId || undefined,
      notes: String(formData.get("notes") || ""),
      sortOrder: await nextSortOrder(date, crewId),
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function setJobStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as
    | "SCHEDULED"
    | "DONE"
    | "SKIPPED";
  await prisma.scheduledJob.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      // Un-doing a job also clears its payment record.
      ...(status !== "DONE" ? { paidAt: null, paymentMethod: null } : {}),
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

/**
 * Rain day off: mark every not-yet-done job on this day as skipped.
 * Jobs stay on the date (nothing is moved). Existing rows still block
 * recurring materialization, so the day stays closed.
 */
export async function rainOffDay(formData: FormData) {
  const from = fromDateInput(String(formData.get("from") || ""));
  await prisma.scheduledJob.updateMany({
    where: {
      date: { gte: startOfDay(from), lte: endOfDay(from) },
      status: "SCHEDULED",
    },
    data: { status: "SKIPPED", paidAt: null, paymentMethod: null },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function setJobPayment(formData: FormData) {
  const id = Number(formData.get("id"));
  const method = String(formData.get("method")); // "CASH" | "BANK" | "UNPAID"
  await prisma.scheduledJob.update({
    where: { id },
    data:
      method === "UNPAID"
        ? { paidAt: null, paymentMethod: null }
        : {
            paidAt: new Date(),
            paymentMethod: method === "CASH" ? "CASH" : "BANK",
          },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateJobNotes(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.scheduledJob.update({
    where: { id },
    data: { notes: String(formData.get("notes") || "") },
  });
  revalidatePath("/calendar");
}

/** Mark every unpaid done job for a customer as paid (from the invoice page). */
export async function markCustomerJobsPaid(formData: FormData) {
  const customerId = Number(formData.get("customerId"));
  const method = String(formData.get("method")) === "CASH" ? "CASH" : "BANK";
  await prisma.scheduledJob.updateMany({
    where: { customerId, status: "DONE", paidAt: null },
    data: { paidAt: new Date(), paymentMethod: method },
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/customers/${customerId}/invoice`);
}

/** Quick total overwrite (legacy). Prefer updateJobExtras for labour + add-ons. */
export async function updateJobPrice(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.scheduledJob.update({
    where: { id },
    data: {
      price: parseAmount(formData.get("price")),
      pricingType: "FIXED",
      hourlyRate: null,
      hours: null,
      workers: null,
      wasteBags: null,
      wasteBagPrice: null,
      materialsCharge: null,
      materialsPaid: null,
      materialsNote: "",
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

/**
 * Edit labour + waste + materials on an existing job. Total price is recomputed.
 * Keeps hourly breakdown when the job is still hourly and labour wasn't overridden.
 */
export async function updateJobExtras(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) return;

  const extras = readExtras(formData);
  const addOns = extras.wasteTotal + extras.materialsChargeTotal;
  const labourInput = String(formData.get("labour") ?? "");
  const labour = labourInput === "" ? null : parseAmount(labourInput);

  let basePrice: number;
  let pricingType = job.pricingType;
  let hourlyRate = job.hourlyRate;
  let hours = job.hours;
  let workers = job.workers;

  if (
    labour == null &&
    job.pricingType === "HOURLY" &&
    job.workers != null &&
    job.hourlyRate != null &&
    job.hours != null
  ) {
    basePrice = computeHourlyPrice(job.workers, job.hourlyRate, job.hours);
  } else {
    basePrice = labour ?? 0;
    pricingType = "FIXED";
    hourlyRate = null;
    hours = null;
    workers = null;
  }

  await prisma.scheduledJob.update({
    where: { id },
    data: {
      price: basePrice + addOns,
      pricingType,
      hourlyRate,
      hours,
      workers,
      wasteBags: extras.wasteBags,
      wasteBagPrice: extras.wasteBagPrice,
      materialsCharge: extras.materialsCharge,
      materialsPaid: extras.materialsPaid,
      materialsNote: extras.materialsNote,
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteJob(formData: FormData) {
  const id = Number(formData.get("id"));
  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) return;

  // If this is an auto-generated recurring occurrence, record an exception so it
  // is not immediately recreated on the next calendar load.
  if (job.recurringSourceCustomerId) {
    await prisma.scheduleException.upsert({
      where: {
        customerId_date: {
          customerId: job.recurringSourceCustomerId,
          date: toStoredDay(job.date),
        },
      },
      update: {},
      create: {
        customerId: job.recurringSourceCustomerId,
        date: toStoredDay(job.date),
      },
    });
  }

  await prisma.scheduledJob.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function moveJob(formData: FormData) {
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir")); // "up" | "down"
  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) return;

  const siblings = await prisma.scheduledJob.findMany({
    where: {
      date: { gte: startOfDay(job.date), lte: endOfDay(job.date) },
      crewId: job.crewId ?? undefined,
    },
    orderBy: { sortOrder: "asc" },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const a = siblings[idx];
  const b = siblings[swapIdx];
  await prisma.$transaction([
    prisma.scheduledJob.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.scheduledJob.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);
  revalidatePath("/calendar");
}

export async function reassignCrew(formData: FormData) {
  const id = Number(formData.get("id"));
  const crewIdRaw = formData.get("crewId");
  const crewId = crewIdRaw ? Number(crewIdRaw) : null;
  await assignJobToCrew(id, crewId);
}

/**
 * Move a job onto a crew (or to "unassigned" when crewId is null). Called
 * directly from the drag-and-drop board on the day view.
 */
export async function assignJobToCrew(id: number, crewId: number | null) {
  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) return;
  if ((job.crewId ?? null) === (crewId ?? null)) return;
  await prisma.scheduledJob.update({
    where: { id },
    data: {
      crewId,
      sortOrder: await nextSortOrder(job.date, crewId),
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}
