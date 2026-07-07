import { prisma } from "@/lib/db";

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.settings.create({
    data: { id: 1, businessName: "EHW Landscapes", employeeRate: 20 },
  });
}
