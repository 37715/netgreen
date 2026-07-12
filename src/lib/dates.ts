/**
 * Date helpers for UK scheduling (Europe/London calendar days).
 *
 * Job dates are stored as UTC noon on the calendar day so Postgres timestamps
 * never drift when the server runs in UTC (e.g. Vercel) while the business
 * thinks in UK local days.
 */

const APP_TIMEZONE = "Europe/London";

/** YYYY-MM-DD for the calendar day in the UK. */
export function calendarDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function partsFromKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m || 1, d: d || 1 };
}

/** Persist a calendar day (UTC noon). Use for all DB writes. */
export function toStoredDay(d: Date): Date {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
}

/** Start of the UK calendar day in UTC (for range queries). */
export function startOfDay(d: Date): Date {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
}

export function endOfDay(d: Date): Date {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  return new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999));
}

export function addDays(d: Date, days: number): Date {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  const t = new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
  t.setUTCDate(t.getUTCDate() + days);
  return new Date(
    Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 12, 0, 0, 0)
  );
}

/** Monday as start of the week (UK convention). */
export function startOfWeek(d: Date): Date {
  const midday = toStoredDay(d);
  const dow = midday.getUTCDay();
  const diff = (dow + 6) % 7;
  return addDays(midday, -diff);
}

export function startOfMonth(d: Date): Date {
  const { y, m } = partsFromKey(calendarDayKey(d));
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0, 0));
}

export function endOfMonth(d: Date): Date {
  const { y, m } = partsFromKey(calendarDayKey(d));
  const last = new Date(Date.UTC(y, m, 0, 12, 0, 0, 0));
  return endOfDay(last);
}

export function isSameDay(a: Date, b: Date): boolean {
  return calendarDayKey(a) === calendarDayKey(b);
}

export function daysBetween(a: Date, b: Date): number {
  const aMid = toStoredDay(a).getTime();
  const bMid = toStoredDay(b).getTime();
  return Math.round((bMid - aMid) / 86_400_000);
}

/** YYYY-MM-DD in UK local time, for <input type="date"> and URL params. */
export function toDateInput(d: Date): string {
  return calendarDayKey(d);
}

/** Parse YYYY-MM-DD as a stored UK calendar day. */
export function fromDateInput(value: string): Date {
  const { y, m, d } = partsFromKey(value);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDayLabel(d: Date): string {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  const midday = new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
  return `${WEEKDAYS[midday.getUTCDay()]} ${day} ${MONTHS[m - 1]}`;
}

export function formatDayShort(d: Date): string {
  const { y, m, d: day } = partsFromKey(calendarDayKey(d));
  const midday = new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
  return `${WEEKDAYS[midday.getUTCDay()]} ${day}`;
}

export function formatRange(from: Date, to: Date): string {
  return `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
}
