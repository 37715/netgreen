"use server";

import { auth, isAuthEnabled } from "@/auth";
import { prisma } from "@/lib/db";
import { fromDateInput, toDateInput, toStoredDay } from "@/lib/dates";
import {
  LEAD_FREQUENCIES,
  LEAD_PRICING_MODELS,
  LEAD_QUOTE_JOB_TYPES,
  isLeadStatus,
  type LeadFrequencyValue,
  type LeadPricingModelValue,
  type LeadQuoteJobTypeValue,
} from "@/lib/leads";
import type {
  LeadFrequency,
  LeadPricingModel,
  LeadQuoteJobType,
  LeadStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUser() {
  if (!isAuthEnabled()) return;
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function optionalDate(formData: FormData, name: string): Date | null {
  const value = String(formData.get(name) || "");
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${name}`);
  const parsed = fromDateInput(value);
  if (toDateInput(parsed) !== value) throw new Error(`Invalid ${name}`);
  return parsed;
}

function optionalAmount(formData: FormData, name: string): number | null {
  const value = String(formData.get(name) || "").trim();
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${name} must be a positive amount`);
  }
  return amount;
}

function optionalPositiveInteger(formData: FormData, name: string): number | null {
  const value = optionalAmount(formData, name);
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a whole number above zero`);
  }
  return value;
}

function readLead(formData: FormData) {
  const rawStatus = String(formData.get("status") || "NEW");
  if (!isLeadStatus(rawStatus)) throw new Error("Invalid lead status");
  const quoteJobType = String(
    formData.get("quoteJobType") || "ONE_OFF"
  ) as LeadQuoteJobTypeValue;
  const pricingModel = String(
    formData.get("pricingModel") || "FIXED_TOTAL"
  ) as LeadPricingModelValue;
  const frequency = String(
    formData.get("frequency") || "ONCE"
  ) as LeadFrequencyValue;

  if (!LEAD_QUOTE_JOB_TYPES.includes(quoteJobType)) {
    throw new Error("Invalid quote job type");
  }
  if (!LEAD_PRICING_MODELS.includes(pricingModel)) {
    throw new Error("Invalid pricing model");
  }
  if (!LEAD_FREQUENCIES.includes(frequency)) {
    throw new Error("Invalid frequency");
  }
  if (
    quoteJobType === "ONE_OFF" &&
    !["FIXED_TOTAL", "HOURLY"].includes(pricingModel)
  ) {
    throw new Error("Invalid one-off pricing model");
  }
  if (
    quoteJobType === "RECURRING" &&
    !["PER_VISIT", "HOURLY", "MONTHLY"].includes(pricingModel)
  ) {
    throw new Error("Invalid recurring pricing model");
  }

  return {
    customerName: String(formData.get("customerName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    area: String(formData.get("area") || "").trim(),
    salesman: String(formData.get("salesman") || "").trim(),
    source: String(formData.get("source") || "").trim(),
    sourceDetail: String(formData.get("sourceDetail") || "").trim(),
    referredBy: String(formData.get("referredBy") || "").trim(),
    workType: String(formData.get("workType") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    status: rawStatus as LeadStatus,
    siteVisitDate: optionalDate(formData, "siteVisitDate"),
    quoteDate: optionalDate(formData, "quoteDate"),
    quoteJobType: quoteJobType as LeadQuoteJobType,
    pricingModel: pricingModel as LeadPricingModel,
    frequency: (quoteJobType === "ONE_OFF" ? "ONCE" : frequency) as LeadFrequency,
    frequencyDetail: String(formData.get("frequencyDetail") || "").trim(),
    quoteValue: optionalAmount(formData, "quoteValue"),
    hourlyRate: optionalAmount(formData, "hourlyRate"),
    estimatedHours: optionalAmount(formData, "estimatedHours"),
    estimatedWorkers: optionalPositiveInteger(formData, "estimatedWorkers"),
    lostReason: String(formData.get("lostReason") || "").trim(),
    outcomeDate: optionalDate(formData, "outcomeDate"),
    finalJobValue: optionalAmount(formData, "finalJobValue"),
    jobType: String(formData.get("jobType") || "").trim(),
    jobDate: optionalDate(formData, "jobDate"),
    followUpDate: optionalDate(formData, "followUpDate"),
    notes: String(formData.get("notes") || "").trim(),
  };
}

export async function createLead(formData: FormData) {
  await requireUser();
  const data = readLead(formData);
  if (!data.customerName) return;

  const lead = await prisma.lead.create({ data });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const data = readLead(formData);
  if (!id || !data.customerName) return;

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return;
  // Won/lost inputs are intentionally hidden in other stages. Preserve that
  // history when someone later edits a phone number or follow-up date.
  if (!formData.has("lostReason")) data.lostReason = existing.lostReason;
  if (!formData.has("outcomeDate")) data.outcomeDate = existing.outcomeDate;
  if (!formData.has("finalJobValue")) data.finalJobValue = existing.finalJobValue;
  if (!formData.has("jobType")) data.jobType = existing.jobType;
  if (!formData.has("jobDate")) data.jobDate = existing.jobDate;

  await prisma.lead.update({ where: { id }, data });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function setLeadStatus(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const rawStatus = String(formData.get("status") || "");
  if (!id || !isLeadStatus(rawStatus)) throw new Error("Invalid lead status");

  const closed = rawStatus === "WON" || rawStatus === "LOST";
  await prisma.lead.update({
    where: { id },
    data: {
      status: rawStatus as LeadStatus,
      outcomeDate: closed ? toStoredDay(new Date()) : null,
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function deleteLead(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!id) return;

  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  redirect("/leads");
}

export async function recordLostReason(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const lostReason = String(formData.get("lostReason") || "").trim();
  if (!id || !lostReason) return;

  await prisma.lead.update({
    where: { id },
    data: {
      status: "LOST",
      lostReason,
      outcomeDate: toStoredDay(new Date()),
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}
