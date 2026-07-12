"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  const businessName =
    String(formData.get("businessName") || "").trim() || "netgreen";
  const employeeRate = parseAmount(formData.get("employeeRate"));
  const taxPotPercent = Math.min(
    100,
    Math.max(0, parseAmount(formData.get("taxPotPercent")))
  );
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { businessName, employeeRate, taxPotPercent },
    create: { id: 1, businessName, employeeRate, taxPotPercent },
  });
  revalidatePath("/", "layout");
}

export async function createCrew(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const last = await prisma.crew.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.crew.create({
    data: {
      name,
      members: String(formData.get("members") || ""),
      colour: String(formData.get("colour") || "#16a34a"),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/calendar");
}

export async function updateCrew(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.crew.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || "Crew",
      members: String(formData.get("members") || ""),
      colour: String(formData.get("colour") || "#16a34a"),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/calendar");
}

export async function setCrewActive(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await prisma.crew.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
  revalidatePath("/calendar");
}
