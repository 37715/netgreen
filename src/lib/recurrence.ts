import { prisma } from "@/lib/db";
import { Recurrence } from "@prisma/client";
import { addDays, isSameDay, startOfDay } from "@/lib/dates";

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
    const dom = a.getDate();
    let year = start.getFullYear();
    let month = start.getMonth();
    // Step month-by-month from the start month until past `end`.
    while (true) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(dom, daysInMonth);
      const occ = new Date(year, month, day);
      if (occ > end) break;
      if (occ >= start && occ >= a) out.push(occ);
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
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
        date: { gte: startOfDay(from), lte: startOfDay(to) },
      },
      select: { recurringSourceCustomerId: true, date: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        customerId: { in: customerIds },
        date: { gte: startOfDay(from), lte: startOfDay(to) },
      },
      select: { customerId: true, date: true },
    }),
  ]);

  const seen = new Set(
    existing.map(
      (e) => `${e.recurringSourceCustomerId}:${startOfDay(e.date).getTime()}`
    )
  );
  // Treat deleted occurrences as already handled so they are not recreated.
  for (const ex of exceptions) {
    seen.add(`${ex.customerId}:${startOfDay(ex.date).getTime()}`);
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
      const key = `${c.id}:${startOfDay(d).getTime()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toCreate.push({
        date: startOfDay(d),
        title: c.name,
        price: c.defaultPrice ?? 0,
        customerId: c.id,
        crewId: c.defaultCrewId ?? null,
        recurringSourceCustomerId: c.id,
      });
    }
  }

  if (toCreate.length === 0) return 0;
  await prisma.scheduledJob.createMany({ data: toCreate });
  return toCreate.length;
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
