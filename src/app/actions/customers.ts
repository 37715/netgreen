"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput } from "@/lib/dates";
import { Recurrence } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readCustomer(formData: FormData) {
  const recurrence = (String(formData.get("recurrence") || "NONE") as Recurrence);
  const anchorStr = String(formData.get("recurrenceAnchor") || "");
  const priceStr = String(formData.get("defaultPrice") || "");
  const crewIdRaw = formData.get("defaultCrewId");
  return {
    name: String(formData.get("name") || "").trim(),
    contact: String(formData.get("contact") || ""),
    address: String(formData.get("address") || ""),
    notes: String(formData.get("notes") || ""),
    recurrence,
    recurrenceAnchor:
      recurrence !== "NONE" && anchorStr ? fromDateInput(anchorStr) : null,
    defaultPrice: priceStr ? parseAmount(priceStr) : null,
    typicalMinutes: (() => {
      const m = Math.round(parseAmount(String(formData.get("typicalMinutes") || "")));
      return m > 0 ? m : null;
    })(),
    defaultCrewId: crewIdRaw ? Number(crewIdRaw) : null,
  };
}

export async function createCustomer(formData: FormData) {
  const data = readCustomer(formData);
  if (!data.name) return;
  await prisma.customer.create({ data });
  revalidatePath("/customers");
  revalidatePath("/calendar");
}

export async function updateCustomer(formData: FormData) {
  const id = Number(formData.get("id"));
  const data = readCustomer(formData);
  if (!data.name) return;
  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath("/calendar");
  redirect("/customers");
}

export async function setCustomerActive(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await prisma.customer.update({ where: { id }, data: { active } });
  revalidatePath("/customers");
}

export async function deleteCustomer(formData: FormData) {
  const id = Number(formData.get("id"));
  // Detach scheduled jobs so we don't lose income history.
  await prisma.scheduledJob.updateMany({
    where: { customerId: id },
    data: { customerId: null, recurringSourceCustomerId: null },
  });
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  revalidatePath("/calendar");
}
