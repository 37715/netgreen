"use server";

import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { CostCategory, ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const customerIdRaw = formData.get("customerId");
  const startStr = String(formData.get("startDate") || "");
  const project = await prisma.project.create({
    data: {
      title,
      quotedPrice: parseAmount(formData.get("quotedPrice")),
      status: (String(formData.get("status") || "ACTIVE") as ProjectStatus),
      customerId: customerIdRaw ? Number(customerIdRaw) : null,
      startDate: startStr ? fromDateInput(startStr) : null,
      notes: String(formData.get("notes") || ""),
    },
  });
  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const id = Number(formData.get("id"));
  const customerIdRaw = formData.get("customerId");
  const startStr = String(formData.get("startDate") || "");
  await prisma.project.update({
    where: { id },
    data: {
      title: String(formData.get("title") || "").trim() || "Project",
      quotedPrice: parseAmount(formData.get("quotedPrice")),
      status: (String(formData.get("status") || "ACTIVE") as ProjectStatus),
      customerId: customerIdRaw ? Number(customerIdRaw) : null,
      startDate: startStr ? fromDateInput(startStr) : null,
      notes: String(formData.get("notes") || ""),
    },
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function deleteProject(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.scheduledJob.updateMany({
    where: { projectId: id },
    data: { projectId: null },
  });
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

export async function addCost(formData: FormData) {
  const projectId = Number(formData.get("projectId"));
  const dateStr = String(formData.get("date") || "");
  await prisma.projectCost.create({
    data: {
      projectId,
      category: (String(formData.get("category") || "MATERIALS") as CostCategory),
      description: String(formData.get("description") || ""),
      amount: parseAmount(formData.get("amount")),
      reimbursable: String(formData.get("reimbursable")) === "on",
      date: dateStr ? fromDateInput(dateStr) : startOfDay(new Date()),
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deleteCost(formData: FormData) {
  const id = Number(formData.get("id"));
  const projectId = Number(formData.get("projectId"));
  await prisma.projectCost.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function addPayment(formData: FormData) {
  const projectId = Number(formData.get("projectId"));
  const dateStr = String(formData.get("date") || "");
  await prisma.payment.create({
    data: {
      projectId,
      amount: parseAmount(formData.get("amount")),
      method: String(formData.get("method") || ""),
      note: String(formData.get("note") || ""),
      date: dateStr ? fromDateInput(dateStr) : startOfDay(new Date()),
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deletePayment(formData: FormData) {
  const id = Number(formData.get("id"));
  const projectId = Number(formData.get("projectId"));
  await prisma.payment.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
