import { addDays, addMonths, calendarDayKey } from "@/lib/dates";

export type OverheadRepeat = "NONE" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const repeatLabel: Record<OverheadRepeat, string> = {
  NONE: "One-off",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/** Guard against runaway loops if an anchor is decades old. */
const MAX_OCCURRENCES = 600;

/**
 * Dates a repeating cost falls on after its first one, up to and including
 * `until`. The first one is the row the user typed in, so it is not repeated.
 */
export function overheadOccurrences(
  recurrence: OverheadRepeat,
  anchor: Date,
  until: Date
): Date[] {
  if (recurrence === "NONE") return [];

  const out: Date[] = [];
  const endKey = calendarDayKey(until);

  for (let step = 1; step <= MAX_OCCURRENCES; step++) {
    const next =
      recurrence === "WEEKLY"
        ? addDays(anchor, 7 * step)
        : addMonths(anchor, recurrence === "YEARLY" ? 12 * step : step);
    if (calendarDayKey(next) > endKey) break;
    out.push(next);
  }

  return out;
}
