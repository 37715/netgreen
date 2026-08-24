"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput, toStoredDay } from "@/lib/dates";
import { materializeOverheads } from "@/lib/overheads";
import { OverheadCategory, OverheadRecurrence } from "@prisma/client";
import { revalidatePath } from "next/cache";

function readDate(formData: FormData): Date {
  const dateStr = String(formData.get("date") || "");
  return dateStr ? toStoredDay(fromDateInput(dateStr)) : toStoredDay(new Date());
}

function readRecurrence(formData: FormData): OverheadRecurrence {
  const value = String(formData.get("recurrence") || "NONE");
  return (["WEEKLY", "MONTHLY", "YEARLY"].includes(value)
    ? value
    : "NONE") as OverheadRecurrence;
}

function refresh() {
  revalidatePath("/overheads");
  revalidatePath("/");
}

export async function createOverhead(formData: FormData) {
  await prisma.overhead.create({
    data: {
      category: (String(formData.get("category") || "OTHER") as OverheadCategory),
      description: String(formData.get("description") || ""),
      amount: parseAmount(formData.get("amount")),
      date: readDate(formData),
      recurrence: readRecurrence(formData),
    },
  });
  await materializeOverheads();
  refresh();
}

/**
 * Edit one cost. On a repeating cost this changes the row you're editing and
 * what future copies are made from — copies already logged keep their figures,
 * so past months stay as they were actually paid.
 */
export async function updateOverhead(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const existing = await prisma.overhead.findUnique({
    where: { id },
    select: { recurringSourceId: true },
  });
  if (!existing) return;

  await prisma.overhead.update({
    where: { id },
    data: {
      category: (String(formData.get("category") || "OTHER") as OverheadCategory),
      description: String(formData.get("description") || ""),
      amount: parseAmount(formData.get("amount")),
      date: readDate(formData),
      // Only the original row drives the repeat; a copy stays a copy.
      recurrence:
        existing.recurringSourceId == null
          ? readRecurrence(formData)
          : undefined,
    },
  });
  await materializeOverheads();
  refresh();
}

/** HMRC-style mileage: log miles, stored as an overhead at 45p/mile. */
export async function logMileage(formData: FormData) {
  const miles = parseAmount(formData.get("miles"));
  if (miles <= 0) return;
  const note = String(formData.get("note") || "").trim();
  await prisma.overhead.create({
    data: {
      category: "MILEAGE",
      description: `${miles} miles @ 45p/mile${note ? ` — ${note}` : ""}`,
      amount: Math.round(miles * 45) / 100,
      date: readDate(formData),
    },
  });
  refresh();
}

export async function deleteOverhead(formData: FormData) {
  const id = Number(formData.get("id"));
  // Deleting the original also removes its copies (cascade in the schema).
  await prisma.overhead.delete({ where: { id } });
  refresh();
}
