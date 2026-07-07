import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/dates";

export type DayCrewInfo = {
  id: number;
  name: string;
  colour: string;
  members: string;
};

/** Crews scheduled to work on this calendar day. */
export async function getCrewsForDay(date: Date): Promise<DayCrewInfo[]> {
  const day = startOfDay(date);
  const rows = await prisma.dayCrew.findMany({
    where: { date: day },
    include: { crew: true },
    orderBy: { sortOrder: "asc" },
  });

  if (rows.length > 0) {
    return rows
      .filter((r) => r.crew.active)
      .map((r) => ({
        id: r.crew.id,
        name: r.crew.name,
        colour: r.crew.colour,
        members: r.crew.members,
      }));
  }

  // No day-specific plan yet — show all active crews (default).
  return prisma.crew.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, colour: true, members: true },
  });
}

/** Active global crews not already on this day. */
export async function getCrewsAvailableToAdd(date: Date): Promise<DayCrewInfo[]> {
  const onDay = await getCrewsForDay(date);
  const onDayIds = new Set(onDay.map((c) => c.id));
  const all = await prisma.crew.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, colour: true, members: true },
  });
  return all.filter((c) => !onDayIds.has(c.id));
}

/** True once this day has been customised (add/remove crew). */
export async function hasExplicitDayCrew(date: Date): Promise<boolean> {
  return (await prisma.dayCrew.count({ where: { date: startOfDay(date) } })) > 0;
}

/**
 * Freeze the default (all active crews) into explicit DayCrew rows before
 * the first add/remove on a day that hasn't been customised yet.
 */
export async function ensureDayCrewSnapshot(date: Date): Promise<void> {
  const day = startOfDay(date);
  if ((await prisma.dayCrew.count({ where: { date: day } })) > 0) return;

  const crews = await prisma.crew.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  if (crews.length === 0) return;

  await prisma.dayCrew.createMany({
    data: crews.map((c, i) => ({ date: day, crewId: c.id, sortOrder: i })),
  });
}

async function nextDayCrewOrder(date: Date): Promise<number> {
  const last = await prisma.dayCrew.findFirst({
    where: { date: startOfDay(date) },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export async function addCrewToDayRecord(date: Date, crewId: number): Promise<void> {
  const day = startOfDay(date);
  const hasExplicit = await hasExplicitDayCrew(day);

  if (!hasExplicit) {
    await prisma.dayCrew.create({
      data: { date: day, crewId, sortOrder: 0 },
    });
    return;
  }

  await ensureDayCrewSnapshot(day);
  await prisma.dayCrew.upsert({
    where: { date_crewId: { date: day, crewId } },
    update: {},
    create: {
      date: day,
      crewId,
      sortOrder: await nextDayCrewOrder(day),
    },
  });
}

export async function removeCrewFromDayRecord(date: Date, crewId: number): Promise<void> {
  const day = startOfDay(date);
  await ensureDayCrewSnapshot(day);

  await prisma.dayCrew.deleteMany({
    where: { date: day, crewId },
  });

  // Jobs on this crew today become unassigned.
  await prisma.scheduledJob.updateMany({
    where: { date: day, crewId },
    data: { crewId: null },
  });
}
