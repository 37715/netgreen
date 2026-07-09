"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { revalidatePath } from "next/cache";

/**
 * Add an extra paid worker to a crew for a given day. Their pay is a cost that
 * reduces that day's profit and shows up in the money summaries.
 */
export async function addCrewLabour(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const date = dateStr ? fromDateInput(dateStr) : startOfDay(new Date());
  const crewIdRaw = formData.get("crewId");
  const crewId = crewIdRaw ? Number(crewIdRaw) : null;
  const name = String(formData.get("name") || "").trim();
  const amount = parseAmount(formData.get("amount"));

  if (!name && amount <= 0) return;

  await prisma.crewLabour.create({
    data: {
      date: startOfDay(date),
      crewId,
      name: name || "Extra help",
      amount,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function removeCrewLabour(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.crewLabour.delete({ where: { id } }).catch(() => {});
  revalidatePath("/calendar");
  revalidatePath("/");
}
