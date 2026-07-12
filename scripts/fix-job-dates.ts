/**
 * One-off: normalise calendar-day timestamps already in the DB.
 * Fixes jobs imported/stored as UK-local midnight (which appear 1 day early on UTC servers).
 */
import { PrismaClient } from "@prisma/client";
import { toStoredDay } from "../src/lib/dates";

const prisma = new PrismaClient();

async function main() {
  const [jobs, dayCrews, exceptions, customers] = await Promise.all([
    prisma.scheduledJob.findMany({ select: { id: true, date: true } }),
    prisma.dayCrew.findMany({ select: { id: true, date: true } }),
    prisma.scheduleException.findMany({ select: { id: true, date: true } }),
    prisma.customer.findMany({
      where: { recurrenceAnchor: { not: null } },
      select: { id: true, recurrenceAnchor: true },
    }),
  ]);

  let jobUpdates = 0;
  for (const row of jobs) {
    const fixed = toStoredDay(row.date);
    if (fixed.getTime() === row.date.getTime()) continue;
    await prisma.scheduledJob.update({ where: { id: row.id }, data: { date: fixed } });
    jobUpdates++;
  }

  let crewUpdates = 0;
  for (const row of dayCrews) {
    const fixed = toStoredDay(row.date);
    if (fixed.getTime() === row.date.getTime()) continue;
    await prisma.dayCrew.update({ where: { id: row.id }, data: { date: fixed } });
    crewUpdates++;
  }

  let exUpdates = 0;
  for (const row of exceptions) {
    const fixed = toStoredDay(row.date);
    if (fixed.getTime() === row.date.getTime()) continue;
    await prisma.scheduleException.update({ where: { id: row.id }, data: { date: fixed } });
    exUpdates++;
  }

  let anchorUpdates = 0;
  for (const c of customers) {
    const anchor = c.recurrenceAnchor!;
    const fixed = toStoredDay(anchor);
    if (fixed.getTime() === anchor.getTime()) continue;
    await prisma.customer.update({
      where: { id: c.id },
      data: { recurrenceAnchor: fixed },
    });
    anchorUpdates++;
  }

  console.log("Date normalisation complete:");
  console.log(`  ScheduledJob:      ${jobUpdates} updated`);
  console.log(`  DayCrew:           ${crewUpdates} updated`);
  console.log(`  ScheduleException: ${exUpdates} updated`);
  console.log(`  Customer anchors:  ${anchorUpdates} updated`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
