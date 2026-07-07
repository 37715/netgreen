import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessName: "netgreen", employeeRate: 20 },
  });

  const crewCount = await prisma.crew.count();
  if (crewCount === 0) {
    await prisma.crew.createMany({
      data: [
        { name: "Crew 1", members: "Ellis", colour: "#16a34a", sortOrder: 0 },
        { name: "Crew 2", members: "Hugo", colour: "#0ea5e9", sortOrder: 1 },
      ],
    });
  }

  console.log("Seed complete (settings + crews only).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
