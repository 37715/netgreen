"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { OverheadCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createOverhead(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  await prisma.overhead.create({
    data: {
      category: (String(formData.get("category") || "OTHER") as OverheadCategory),
      description: String(formData.get("description") || ""),
      amount: parseAmount(formData.get("amount")),
      date: dateStr ? fromDateInput(dateStr) : startOfDay(new Date()),
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
