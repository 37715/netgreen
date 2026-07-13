"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { revalidatePath } from "next/cache";

export async function createDebt(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const amount = parseAmount(formData.get("amount"));
  if (!name || amount <= 0) return;
  await prisma.debt.create({
    data: {
      name,
      amount,
      note: String(formData.get("note") || "").trim(),
    },
  });
  revalidatePath("/");
}

export async function markDebtPaid(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.debt.update({
    where: { id },
    data: { paidAt: new Date() },
  });
  revalidatePath("/");
}

export async function deleteDebt(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.debt.delete({ where: { id } });
  revalidatePath("/");
}
