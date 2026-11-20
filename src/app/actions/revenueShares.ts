"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { computeRevenueShareWeek } from "@/lib/finance";
import {
  fromDateInput,
  startOfWeek,
  toDateInput,
  toStoredDay,
} from "@/lib/dates";
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
  const share = await prisma.revenueShare.findUnique({
    where: { id },
    select: { _count: { select: { weeks: true } } },
  });
  if (!share) return;

  // Never erase figures that have already entered the accounts.
  if (share._count.weeks > 0) {
    await prisma.revenueShare.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.$transaction([
      prisma.customer.updateMany({
        where: { revenueShareId: id },
        data: { revenueShareId: null },
      }),
      prisma.revenueShare.delete({ where: { id } }),
    ]);
  }
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

  await prisma.$transaction(async (tx) => {
    await tx.customer.updateMany({
      where: { revenueShareId: id },
      data: { revenueShareId: null },
    });
    if (selected.length > 0) {
      await tx.customer.updateMany({
        where: { id: { in: selected } },
        data: { revenueShareId: id },
      });
    }
  });
  revalidateSharePaths(id);
  redirect(`/revenue-share/${id}?saved=1&count=${selected.length}`);
}

/** Parse a Monday key (YYYY-MM-DD) from a form into a stored calendar day. */
function readWeekStart(formData: FormData): Date | null {
  const key = String(formData.get("weekStart") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = fromDateInput(key);
  if (toDateInput(parsed) !== key) return null;
  const monday = startOfWeek(parsed);
  if (toDateInput(monday) !== key) return null;
  return toStoredDay(monday);
}

/** Save the manually agreed cost for one calendar week. */
export async function setRevenueShareWeekAmount(formData: FormData) {
  const shareId = Number(formData.get("id"));
  const weekStart = readWeekStart(formData);
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const amount = Number(rawAmount);
  if (
    !Number.isInteger(shareId) ||
    shareId <= 0 ||
    !weekStart ||
    rawAmount === "" ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return;
  }

  const totals = await computeRevenueShareWeek(shareId, weekStart);
  if (!totals) return;
  const roundedAmount = Math.round(amount * 100) / 100;

  await prisma.revenueShareWeek.upsert({
    where: { shareId_weekStart: { shareId, weekStart } },
    create: {
      shareId,
      weekStart,
      amount: roundedAmount,
      labourTakings: totals.labourTakings,
      jobs: totals.jobs,
      sentAt: new Date(),
    },
    update: {
      amount: roundedAmount,
      labourTakings: totals.labourTakings,
      jobs: totals.jobs,
      sentAt: new Date(),
    },
  });
  revalidateSharePaths(shareId);
}
