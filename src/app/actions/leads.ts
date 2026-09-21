"use server";

import { auth, isAuthEnabled } from "@/auth";
import { prisma } from "@/lib/db";
import { fromDateInput, toStoredDay } from "@/lib/dates";
import { isLeadStatus } from "@/lib/leads";
import { parseAmount } from "@/lib/money";
import type { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUser() {
  if (!isAuthEnabled()) return;
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function optionalDate(formData: FormData, name: string): Date | null {
  const value = String(formData.get(name) || "");
  return value ? fromDateInput(value) : null;
}

function optionalAmount(formData: FormData, name: string): number | null {
  const value = String(formData.get(name) || "").trim();
  return value ? parseAmount(value) : null;
}

function readLead(formData: FormData) {
  const rawStatus = String(formData.get("status") || "NEW");
  const status = isLeadStatus(rawStatus) ? rawStatus : "NEW";

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
    status: status as LeadStatus,
    siteVisitDate: optionalDate(formData, "siteVisitDate"),
    quoteDate: optionalDate(formData, "quoteDate"),
    quoteValue: optionalAmount(formData, "quoteValue"),
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

  await prisma.lead.update({ where: { id }, data });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function setLeadStatus(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const rawStatus = String(formData.get("status") || "");
  if (!id || !isLeadStatus(rawStatus)) return;

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
