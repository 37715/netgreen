import { prisma } from "@/lib/db";
import { Recurrence } from "@prisma/client";
import {
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
  startOfMonth,
  toStoredDay,
  calendarDayKey,
} from "@/lib/dates";

function partsFromKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m || 1, d: d || 1 };
}

/** All occurrence dates for a recurring customer within [from, to] inclusive. */
export function occurrencesInRange(
  recurrence: Recurrence,
  anchor: Date,
  from: Date,
  to: Date
): Date[] {
  const out: Date[] = [];
  const a = startOfDay(anchor);
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (recurrence === "NONE") return out;

  if (recurrence === "WEEKLY" || recurrence === "FORTNIGHTLY") {
    const step = recurrence === "WEEKLY" ? 7 : 14;
    // Find the first occurrence on/after `start`.
    let cursor = new Date(a);
    if (cursor < start) {
      const diff = Math.ceil(
        (start.getTime() - cursor.getTime()) / (step * 86_400_000)
      );
      cursor = addDays(cursor, diff * step);
    }
    while (cursor <= end) {
      if (cursor >= start) out.push(new Date(cursor));
      cursor = addDays(cursor, step);
    }
    return out;
  }

  if (recurrence === "MONTHLY") {
    const dom = partsFromKey(calendarDayKey(a)).d;
    let cursor = startOfMonth(start);
    const endKey = calendarDayKey(end);
    while (calendarDayKey(cursor) <= endKey) {
      const { y, m } = partsFromKey(calendarDayKey(cursor));
      const daysInMonth = new Date(Date.UTC(y, m, 0, 12, 0, 0, 0)).getUTCDate();
      const day = Math.min(dom, daysInMonth);
      const occ = new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
      if (
        calendarDayKey(occ) >= calendarDayKey(start) &&
        calendarDayKey(occ) >= calendarDayKey(a)
      ) {
        out.push(occ);
      }
      cursor = new Date(Date.UTC(y, m, 1, 12, 0, 0, 0));
    }
    return out;
  }

  return out;
}

/**
 * Ensure recurring customers have ScheduledJob rows for every occurrence in the
 * given range. Idempotent: skips occurrences that already exist (matched by
 * recurringSourceCustomerId + day). Returns the number of jobs created.
 */
export async function materializeRecurring(from: Date, to: Date): Promise<number> {
  const customers = await prisma.customer.findMany({
    where: {
      active: true,
      recurrence: { not: "NONE" },
      recurrenceAnchor: { not: null },
    },
  });
  if (customers.length === 0) return 0;

  const customerIds = customers.map((c) => c.id);
  const [existing, exceptions] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: {
        recurringSourceCustomerId: { in: customerIds },
        date: { gte: startOfDay(from), lte: endOfDay(to) },
      },
      select: { recurringSourceCustomerId: true, date: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        customerId: { in: customerIds },
        date: { gte: startOfDay(from), lte: endOfDay(to) },
      },
      select: { customerId: true, date: true },
    }),
  ]);

  const seen = new Set(
    existing.map(
      (e) => `${e.recurringSourceCustomerId}:${calendarDayKey(e.date)}`
    )
  );
  // Treat deleted occurrences as already handled so they are not recreated.
  for (const ex of exceptions) {
    seen.add(`${ex.customerId}:${calendarDayKey(ex.date)}`);
  }

  const toCreate: {
    date: Date;
    title: string;
    price: number;
    customerId: number;
    crewId: number | null;
    recurringSourceCustomerId: number;
  }[] = [];

  for (const c of customers) {
    const dates = occurrencesInRange(
      c.recurrence,
      c.recurrenceAnchor as Date,
      from,
      to
    );
    for (const d of dates) {
      const key = `${c.id}:${calendarDayKey(d)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toCreate.push({
        date: toStoredDay(d),
        title: c.name,
        price: c.defaultPrice ?? 0,
        customerId: c.id,
        crewId: c.defaultCrewId ?? null,
        recurringSourceCustomerId: c.id,
      });
    }
  }

  if (toCreate.length === 0) return 0;
  // skipDuplicates relies on @@unique([recurringSourceCustomerId, date]) so
  // concurrent calendar loads cannot create a pile of the same occurrence.
  const result = await prisma.scheduledJob.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return result.count;
}

/** Convenience guard used in UI to avoid duplicate scheduling on the same day. */
export function alreadyOnDay(
  jobs: { recurringSourceCustomerId: number | null; date: Date }[],
  customerId: number,
  day: Date
): boolean {
  return jobs.some(
    (j) =>
      j.recurringSourceCustomerId === customerId && isSameDay(j.date, day)
  );
}
