"use server";

import { auth, isAuthEnabled } from "@/auth";
import { prisma } from "@/lib/db";
import { invoiceSettingsFromFormData } from "@/lib/invoice";
import { revalidatePath } from "next/cache";

async function requireSignedInUser() {
  if (!isAuthEnabled()) return;
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

export async function saveInvoiceDefaults(formData: FormData) {
  await requireSignedInUser();
  const invoiceSettings = invoiceSettingsFromFormData(formData);

  await prisma.settings.upsert({
    where: { id: 1 },
    update: invoiceSettings,
    create: {
      id: 1,
      ...invoiceSettings,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/paid/[id]/invoice", "page");
}
