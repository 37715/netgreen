"use server";

import { prisma } from "@/lib/db";
import { parseAmount, computeHourlyPrice } from "@/lib/money";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { PricingType, Recurrence } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function nextSortOrder(date: Date, crewId: number | null): Promise<number> {
  const last = await prisma.scheduledJob.findFirst({
    where: { date: startOfDay(date), crewId: crewId ?? undefined },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

function readJobPrice(formData: FormData): {
  price: number;
  pricingType: PricingType;
  hourlyRate: number | null;
  hours: number | null;
  workers: number | null;
} {
  const pricingType = (
    String(formData.get("pricingType") || "FIXED") === "HOURLY" ? "HOURLY" : "FIXED"
  ) as PricingType;

  if (pricingType === "HOURLY") {
    const workers = Math.max(1, Math.round(parseAmount(formData.get("workers")) || 1));
    const hourlyRate = parseAmount(formData.get("hourlyRate"));
    const hours = parseAmount(formData.get("hours"));
    return {
      price: computeHourlyPrice(workers, hourlyRate, hours),
      pricingType,
      hourlyRate,
      hours,
      workers,
    };
  }

  return {
    price: parseAmount(formData.get("price")),
    pricingType: "FIXED",
    hourlyRate: null,
    hours: null,
    workers: null,
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
  const { price } = pricing;

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
          recurrenceAnchor: repeat !== "NONE" ? startOfDay(date) : null,
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
        updates.recurrenceAnchor = startOfDay(date);
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
            customerId_date: { customerId, date: startOfDay(date) },
          },
        })
        .catch(() => {});
    }
  }

  const title = what || customerName || "Job";

  await prisma.scheduledJob.create({
    data: {
      date: startOfDay(date),
      title,
      price: pricing.price,
      pricingType: pricing.pricingType,
      hourlyRate: pricing.hourlyRate,
      hours: pricing.hours,
      workers: pricing.workers,
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
      date: startOfDay(date),
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
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

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
          date: startOfDay(job.date),
        },
      },
      update: {},
      create: {
        customerId: job.recurringSourceCustomerId,
        date: startOfDay(job.date),
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
    where: { date: startOfDay(job.date), crewId: job.crewId ?? undefined },
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
