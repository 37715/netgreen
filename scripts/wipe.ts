import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.scheduleException.deleteMany();
  await prisma.dayCrew.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.projectCost.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.overhead.deleteMany();
  console.log("All jobs, customers, projects and overheads cleared.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
