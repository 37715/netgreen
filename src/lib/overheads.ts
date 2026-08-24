import { prisma } from "@/lib/db";
import { calendarDayKey, toStoredDay } from "@/lib/dates";
import { overheadOccurrences } from "@/lib/overhead-recurrence";

/**
 * Fill in repeating costs up to today so every week, month or year they belong
 * to carries the charge. Idempotent: the unique index on
 * (recurringSourceId, date) stops concurrent page loads doubling up. Nothing is
 * created in the future, so months you haven't reached yet stay clean.
 */
export async function materializeOverheads(now = new Date()): Promise<number> {
  const templates = await prisma.overhead.findMany({
    where: { recurrence: { not: "NONE" }, recurringSourceId: null },
    select: {
      id: true,
      date: true,
      recurrence: true,
      category: true,
      description: true,
      amount: true,
    },
  });
  if (templates.length === 0) return 0;

  const existing = await prisma.overhead.findMany({
    where: { recurringSourceId: { in: templates.map((t) => t.id) } },
    select: { recurringSourceId: true, date: true },
  });
  const seen = new Set(
    existing.map((e) => `${e.recurringSourceId}:${calendarDayKey(e.date)}`)
  );

  const toCreate = templates.flatMap((t) =>
    overheadOccurrences(t.recurrence, t.date, now)
      .filter((d) => !seen.has(`${t.id}:${calendarDayKey(d)}`))
      .map((d) => ({
        date: toStoredDay(d),
        category: t.category,
        description: t.description,
        amount: t.amount,
        recurringSourceId: t.id,
      }))
  );
  if (toCreate.length === 0) return 0;

  const result = await prisma.overhead.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return result.count;
}
