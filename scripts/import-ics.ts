/**
 * Import a Google Calendar .ics export into netgreen as ScheduledJobs.
 *
 * Raw import: each event occurrence becomes an unassigned job at £0, titled with
 * the event summary. Location + original time are kept in notes, along with a
 * hidden dedupe marker so re-running never creates duplicates.
 *
 * Recurring events are expanded into individual jobs across a date window.
 * Modified single instances (RECURRENCE-ID overrides) replace the original slot.
 *
 * Usage:
 *   tsx scripts/import-ics.ts <path-to-ics> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--all] [--dry]
 *
 * Assumes the machine's local timezone is Europe/London (matches the export).
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { calendarDayKey, toStoredDay } from "../src/lib/dates";

const prisma = new PrismaClient();

// ---------- args ----------
const args = process.argv.slice(2);
const flags = new Map<string, string>();
let filePath = "";
for (const a of args) {
  if (a.startsWith("--")) {
    const [k, v] = a.slice(2).split("=");
    flags.set(k, v ?? "true");
  } else {
    filePath = a;
  }
}
if (!filePath) {
  filePath = "D:/downloads/ehwlandscapes@gmail.com.ical/ehwlandscapes@gmail.com.ics";
}
const DRY = flags.has("dry");
const INCLUDE_PAST = flags.has("all");

function parseDayArg(v: string | undefined): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const today = new Date();
today.setHours(0, 0, 0, 0);
const windowFrom = INCLUDE_PAST
  ? new Date(2000, 0, 1)
  : parseDayArg(flags.get("from")) ?? today;
const windowTo =
  parseDayArg(flags.get("to")) ?? new Date(2026, 11, 31, 23, 59, 59);

// ---------- ics parsing ----------
type Prop = { name: string; params: Record<string, string>; value: string };
type VEvent = {
  uid: string;
  summary: string;
  location: string;
  status: string;
  dtstart?: IcsDate;
  rrule?: Record<string, string>;
  recurrenceId?: IcsDate;
};
type IcsDate = {
  /** JS Date instant (best-effort, London-local). */
  date: Date;
  allDay: boolean;
  /** local wall-clock parts, used for matching + time-of-day */
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
};

function unfold(raw: string): string[] {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = left.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const [k, v] = parts[i].split("=");
    if (k) params[k.toUpperCase()] = v ?? "";
  }
  return { name, params, value };
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string, params: Record<string, string>): IcsDate {
  // All-day: YYYYMMDD
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4);
    const mo = +value.slice(4, 6);
    const d = +value.slice(6, 8);
    return { date: new Date(y, mo - 1, d), allDay: true, y, mo, d, h: 0, mi: 0 };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) {
    // Fallback: treat as today midnight
    return { date: new Date(value), allDay: false, y: 0, mo: 0, d: 0, h: 0, mi: 0 };
  }
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = +ys, mo = +mos, d = +ds, h = +hs, mi = +mis, s = +ss;
  if (z) {
    // UTC instant -> read back London-local wall parts
    const inst = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
    return {
      date: inst,
      allDay: false,
      y: inst.getFullYear(),
      mo: inst.getMonth() + 1,
      d: inst.getDate(),
      h: inst.getHours(),
      mi: inst.getMinutes(),
    };
  }
  // Floating / TZID=Europe/London -> local wall time
  return { date: new Date(y, mo - 1, d, h, mi, s), allDay: false, y, mo, d, h, mi };
}

function parseRRule(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of value.split(";")) {
    const [k, v] = part.split("=");
    if (k) out[k.toUpperCase()] = v ?? "";
  }
  return out;
}

function parseEvents(raw: string): VEvent[] {
  const lines = unfold(raw);
  const events: VEvent[] = [];
  let cur: VEvent | null = null;
  let depth = 0; // nested components inside a VEVENT (e.g. VALARM)
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { uid: "", summary: "", location: "", status: "" };
      depth = 0;
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith("BEGIN:")) { depth++; continue; }
    if (line.startsWith("END:")) { depth--; continue; }
    if (depth > 0) continue; // skip VALARM etc.

    const p = parseProp(line);
    if (!p) continue;
    switch (p.name) {
      case "UID": cur.uid = p.value; break;
      case "SUMMARY": cur.summary = unescapeText(p.value); break;
      case "LOCATION": cur.location = unescapeText(p.value); break;
      case "STATUS": cur.status = p.value.toUpperCase(); break;
      case "DTSTART": cur.dtstart = parseIcsDate(p.value, p.params); break;
      case "RRULE": cur.rrule = parseRRule(p.value); break;
      case "RECURRENCE-ID": cur.recurrenceId = parseIcsDate(p.value, p.params); break;
    }
  }
  return events;
}

// ---------- recurrence expansion ----------
const DAY_CODE: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function startOfLocalDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function weekStart(d: Date, wkst: number): Date {
  const r = startOfLocalDay(d);
  const diff = (r.getDay() - wkst + 7) % 7;
  return addDays(r, -diff);
}
function parseUntil(rrule: Record<string, string>): Date | null {
  const u = rrule.UNTIL;
  if (!u) return null;
  const m = u.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return null;
  const [, y, mo, d, , h, mi, s] = m;
  if (h) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  return new Date(+y, +mo - 1, +d, 23, 59, 59);
}

type Occ = { day: Date; start: Date; h: number; mi: number };

function keyOf(y: number, mo: number, d: number, h: number, mi: number): string {
  return `${y}-${mo}-${d}-${h}-${mi}`;
}

function expand(ev: VEvent, skipKeys: Set<string>): Occ[] {
  const s = ev.dtstart!;
  const occs: Occ[] = [];
  const emit = (dayY: number, dayMo: number, dayD: number) => {
    const day = new Date(dayY, dayMo - 1, dayD);
    const start = new Date(dayY, dayMo - 1, dayD, s.h, s.mi);
    occs.push({ day, start, h: s.h, mi: s.mi });
  };

  if (!ev.rrule) {
    emit(s.y, s.mo, s.d);
    return occs;
  }

  const freq = ev.rrule.FREQ;
  const interval = Math.max(1, +(ev.rrule.INTERVAL || "1"));
  const count = ev.rrule.COUNT ? +ev.rrule.COUNT : Infinity;
  const until = parseUntil(ev.rrule);
  const hardEnd = until && until < windowTo ? until : windowTo;
  let produced = 0;

  if (freq === "WEEKLY") {
    const wkst = DAY_CODE[ev.rrule.WKST] ?? 1;
    const byDays = (ev.rrule.BYDAY ? ev.rrule.BYDAY.split(",") : [])
      .map((c) => DAY_CODE[c.replace(/^[+-]?\d+/, "")])
      .filter((n) => n !== undefined);
    const days = byDays.length ? byDays : [s.date.getDay()];
    const base = weekStart(new Date(s.y, s.mo - 1, s.d), wkst);
    let cursor = new Date(s.y, s.mo - 1, s.d); // series start day
    const seriesStartMs = new Date(s.y, s.mo - 1, s.d, s.h, s.mi).getTime();
    while (cursor.getTime() <= hardEnd.getTime() && produced < count) {
      if (days.includes(cursor.getDay())) {
        const weeks = Math.round(
          (weekStart(cursor, wkst).getTime() - base.getTime()) / (7 * 86400000)
        );
        if (weeks >= 0 && weeks % interval === 0) {
          const occStart = new Date(
            cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), s.h, s.mi
          );
          if (occStart.getTime() >= seriesStartMs) {
            produced++;
            const k = keyOf(
              cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate(), s.h, s.mi
            );
            if (
              occStart.getTime() >= windowFrom.getTime() &&
              occStart.getTime() <= windowTo.getTime() &&
              !skipKeys.has(k)
            ) {
              emit(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
            }
          }
        }
      }
      cursor = addDays(cursor, 1);
    }
    return occs;
  }

  if (freq === "MONTHLY") {
    const byMonthDay = ev.rrule.BYMONTHDAY ? +ev.rrule.BYMONTHDAY : s.d;
    let y = s.y;
    let mo = s.mo; // 1-based
    const baseIdx = s.y * 12 + (s.mo - 1);
    const seriesStartMs = new Date(s.y, s.mo - 1, s.d, s.h, s.mi).getTime();
    while (produced < count) {
      const occStart = new Date(y, mo - 1, byMonthDay, s.h, s.mi);
      if (occStart.getTime() > hardEnd.getTime()) break;
      const validDay = occStart.getMonth() === mo - 1; // guard e.g. Feb 30
      const monthsDiff = y * 12 + (mo - 1) - baseIdx;
      if (
        validDay &&
        monthsDiff >= 0 &&
        monthsDiff % interval === 0 &&
        occStart.getTime() >= seriesStartMs
      ) {
        produced++;
        const k = keyOf(y, mo, byMonthDay, s.h, s.mi);
        if (
          occStart.getTime() >= windowFrom.getTime() &&
          occStart.getTime() <= windowTo.getTime() &&
          !skipKeys.has(k)
        ) {
          emit(y, mo, byMonthDay);
        }
      }
      mo++;
      if (mo > 12) { mo = 1; y++; }
      if (y > windowTo.getFullYear() + 1) break;
    }
    return occs;
  }

  if (freq === "DAILY") {
    let cursor = new Date(s.y, s.mo - 1, s.d);
    const seriesStartMs = cursor.getTime();
    while (cursor.getTime() <= hardEnd.getTime() && produced < count) {
      const idx = Math.round((cursor.getTime() - seriesStartMs) / 86400000);
      if (idx % interval === 0) {
        produced++;
        const occStart = new Date(
          cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), s.h, s.mi
        );
        const k = keyOf(
          cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate(), s.h, s.mi
        );
        if (
          occStart.getTime() >= windowFrom.getTime() &&
          occStart.getTime() <= windowTo.getTime() &&
          !skipKeys.has(k)
        ) {
          emit(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
        }
      }
      cursor = addDays(cursor, 1);
    }
    return occs;
  }

  // Unknown/unsupported freq (e.g. YEARLY): single occurrence
  emit(s.y, s.mo, s.d);
  return occs;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main() {
  const raw = readFileSync(filePath, "utf8");
  const events = parseEvents(raw).filter((e) => e.dtstart && e.status !== "CANCELLED");

  const overrides = events.filter((e) => e.recurrenceId);
  const masters = events.filter((e) => !e.recurrenceId);

  // Original-slot keys to skip when expanding each series.
  const skipByUid = new Map<string, Set<string>>();
  for (const o of overrides) {
    const r = o.recurrenceId!;
    if (!skipByUid.has(o.uid)) skipByUid.set(o.uid, new Set());
    skipByUid.get(o.uid)!.add(keyOf(r.y, r.mo, r.d, r.h, r.mi));
  }

  type Candidate = {
    uid: string;
    day: Date;
    start: Date;
    title: string;
    location: string;
    allDay: boolean;
    marker: string;
  };
  const candidates: Candidate[] = [];
  const pushOccs = (ev: VEvent, occs: Occ[]) => {
    for (const oc of occs) {
      const marker = `[gcal:${ev.uid}#${dayKeyOf(oc.day)}]`;
      candidates.push({
        uid: ev.uid,
        day: oc.day,
        start: oc.start,
        title: ev.summary || "(no title)",
        location: ev.location,
        allDay: ev.dtstart!.allDay,
        marker,
      });
    }
  };

  for (const m of masters) {
    const skip = skipByUid.get(m.uid) ?? new Set<string>();
    pushOccs(m, expand(m, skip));
  }
  for (const o of overrides) {
    // Single occurrence at its (possibly moved) DTSTART.
    pushOccs(o, expand({ ...o, rrule: undefined }, new Set()));
  }

  // Dedupe against anything already imported (marker substring in notes).
  const existing = await prisma.scheduledJob.findMany({
    where: { notes: { contains: "[gcal:" } },
    select: { notes: true },
  });
  const existingMarkers = new Set<string>();
  for (const e of existing) {
    const mm = e.notes.match(/\[gcal:[^\]]+\]/g);
    if (mm) mm.forEach((x) => existingMarkers.add(x));
  }

  // Also dedupe within this batch.
  const seen = new Set<string>();
  const fresh = candidates.filter((c) => {
    if (existingMarkers.has(c.marker) || seen.has(c.marker)) return false;
    seen.add(c.marker);
    return true;
  });

  // Group by day, order by start time, assign sortOrder after existing jobs.
  const byDay = new Map<string, Candidate[]>();
  for (const c of fresh) {
    const k = dayKeyOf(c.day);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(c);
  }

  let inserted = 0;
  const dayKeys = [...byDay.keys()].sort();
  for (const dk of dayKeys) {
    const list = byDay.get(dk)!.sort((a, b) => a.start.getTime() - b.start.getTime());
    const day = list[0].day;
    const dayStart = toStoredDay(day);

    let base = 0;
    if (!DRY) {
      const last = await prisma.scheduledJob.findFirst({
        where: { date: dayStart, crewId: null },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      base = (last?.sortOrder ?? -1) + 1;
    }

    const rows = list.map((c, i) => {
      const timeLabel = c.allDay ? "all day" : `${pad(c.start.getHours())}:${pad(c.start.getMinutes())}`;
      const notesParts = [
        c.location ? c.location : null,
        `Google Calendar · ${timeLabel}`,
        c.marker,
      ].filter(Boolean);
      return {
        date: dayStart,
        title: c.title,
        price: 0,
        notes: notesParts.join("\n"),
        crewId: null as number | null,
        customerId: null as number | null,
        sortOrder: base + i,
      };
    });

    if (!DRY) {
      await prisma.scheduledJob.createMany({ data: rows });
    }
    inserted += rows.length;
  }

  // ---------- report ----------
  const recurringMasters = masters.filter((m) => m.rrule).length;
  console.log("=== netgreen ICS import ===");
  console.log(`File:            ${filePath}`);
  console.log(`Window:          ${dayKeyOf(windowFrom)} .. ${dayKeyOf(windowTo)}${INCLUDE_PAST ? " (incl. past)" : ""}`);
  console.log(`Events parsed:   ${events.length} (${recurringMasters} recurring series, ${overrides.length} modified instances)`);
  console.log(`Occurrences:     ${candidates.length} generated in window`);
  console.log(`Already present: ${candidates.length - fresh.length} (skipped as duplicates)`);
  console.log(`${DRY ? "WOULD INSERT" : "Inserted"}:     ${inserted} jobs across ${dayKeys.length} days`);
  if (DRY) console.log("\n(dry run — nothing was written)");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
