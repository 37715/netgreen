"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput, startOfDay, toStoredDay } from "@/lib/dates";
import { OverheadCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createOverhead(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  await prisma.overhead.create({
    data: {
      category: (String(formData.get("category") || "OTHER") as OverheadCategory),
      description: String(formData.get("description") || ""),
      amount: parseAmount(formData.get("amount")),
      date: dateStr ? toStoredDay(fromDateInput(dateStr)) : toStoredDay(new Date()),
    },
  });
  revalidatePath("/overheads");
  revalidatePath("/");
}

/** HMRC-style mileage: log miles, stored as an overhead at 45p/mile. */
export async function logMileage(formData: FormData) {
  const miles = parseAmount(formData.get("miles"));
  if (miles <= 0) return;
  const dateStr = String(formData.get("date") || "");
  const note = String(formData.get("note") || "").trim();
  await prisma.overhead.create({
    data: {
      category: "MILEAGE",
      description: `${miles} miles @ 45p/mile${note ? ` — ${note}` : ""}`,
      amount: Math.round(miles * 45) / 100,
      date: dateStr ? toStoredDay(fromDateInput(dateStr)) : toStoredDay(new Date()),
    },
  });
  revalidatePath("/overheads");
  revalidatePath("/");
}

export async function deleteOverhead(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.overhead.delete({ where: { id } });
  revalidatePath("/overheads");
  revalidatePath("/");
}
