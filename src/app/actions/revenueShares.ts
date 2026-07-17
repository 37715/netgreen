"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateSharePaths(id?: number) {
  revalidatePath("/");
  revalidatePath("/revenue-share");
  revalidatePath("/customers");
  if (id != null) revalidatePath(`/revenue-share/${id}`);
}

export async function createRevenueShare(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const percent = parseAmount(formData.get("percent"));
  if (!name || percent <= 0) return;
  const share = await prisma.revenueShare.create({
    data: {
      name,
      percent,
      notes: String(formData.get("notes") || "").trim(),
    },
  });
  revalidateSharePaths(share.id);
  redirect(`/revenue-share/${share.id}`);
}

export async function updateRevenueShare(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const percent = parseAmount(formData.get("percent"));
  if (!id || !name || percent <= 0) return;
  await prisma.revenueShare.update({
    where: { id },
    data: {
      name,
      percent,
      notes: String(formData.get("notes") || "").trim(),
      active: String(formData.get("active") || "true") === "true",
    },
  });
  revalidateSharePaths(id);
}

export async function setRevenueShareActive(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (!id) return;
  await prisma.revenueShare.update({ where: { id }, data: { active } });
  revalidateSharePaths(id);
}

export async function deleteRevenueShare(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.customer.updateMany({
    where: { revenueShareId: id },
    data: { revenueShareId: null },
  });
  await prisma.revenueShare.delete({ where: { id } });
  revalidateSharePaths();
  redirect("/revenue-share");
}

/** Replace the set of customers attached to a revenue-share deal. */
export async function setRevenueShareCustomers(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const selected = formData
    .getAll("customerId")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  await prisma.$transaction([
    prisma.customer.updateMany({
      where: { revenueShareId: id },
      data: { revenueShareId: null },
    }),
    ...(selected.length > 0
      ? [
          prisma.customer.updateMany({
            where: { id: { in: selected } },
            data: { revenueShareId: id },
          }),
        ]
      : []),
  ]);
  revalidateSharePaths(id);
}
