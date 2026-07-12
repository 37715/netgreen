import Link from "next/link";
import { prisma } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurrence";
import { formatMoney } from "@/lib/money";
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  toDateInput,
  fromDateInput,
  isSameDay,
  formatDayLabel,
  formatDayShort,
} from "@/lib/dates";
import { JobRowData } from "@/components/JobRow";
import { DayBoard, GroupInfo, BoardJob, LabourEntry } from "@/components/DayBoard";
import { JobComposer } from "@/components/JobComposer";
import { DayCrewBar } from "@/components/DayCrewBar";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { getCrewsForDay, getCrewsAvailableToAdd } from "@/lib/day-crews";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const selected = sp.date ? fromDateInput(sp.date) : startOfDay(new Date());
  const view = sp.view === "week" ? "week" : "day";

  const [crews, customers] = await Promise.all([
    prisma.crew.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { name: true, address: true, defaultPrice: true, defaultCrewId: true },
    }),
  ]);

  // Week view still uses global crews for job badges on days without explicit plans.

  return (
    <div>
      <CalendarHeader selected={selected} view={view} />
      {view === "day" ? (
        <DayView selected={selected} customers={customers} />
      ) : (
        <WeekView selected={selected} crews={crews} />
      )}
    </div>
  );
}

function CalendarHeader({ selected, view }: { selected: Date; view: string }) {
  const step = view === "week" ? 7 : 1;
  const prev = toDateInput(addDays(selected, -step));
  const next = toDateInput(addDays(selected, step));
  const today = toDateInput(new Date());
  const isToday = isSameDay(selected, new Date());
  const eyebrow = view === "week" ? "Week of" : isToday ? "Today" : "Day";
  const label =
    view === "week"
      ? formatDayLabel(startOfWeek(selected))
      : formatDayLabel(selected);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <Link
            href={`/calendar?view=${view}&date=${prev}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-900">
            {label}
          </h1>
          <Link
            href={`/calendar?view=${view}&date=${next}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            aria-label="Next"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
          {!isToday && (
            <Link href={`/calendar?view=${view}&date=${today}`} className="btn-ghost ml-1">
              Today
            </Link>
          )}
        </div>
      </div>
      <div className="flex rounded-xl border border-stone-200 bg-white p-1">
        <Link
          href={`/calendar?view=day&date=${toDateInput(selected)}`}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
            view === "day" ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Day
        </Link>
        <Link
          href={`/calendar?view=week&date=${toDateInput(selected)}`}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
            view === "week" ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Week
        </Link>
      </div>
    </div>
  );
}

async function DayView({
  selected,
  customers,
}: {
  selected: Date;
  customers: { name: string; address: string; defaultPrice: number | null; defaultCrewId: number | null }[];
}) {
  await materializeRecurring(selected, selected);

  const dateStr = toDateInput(selected);
  const [crews, availableCrews, jobs, labour, settings] = await Promise.all([
    getCrewsForDay(selected),
    getCrewsAvailableToAdd(selected),
    prisma.scheduledJob.findMany({
      where: { date: { gte: startOfDay(selected), lte: endOfDay(selected) } },
      include: { customer: { select: { id: true, name: true, address: true } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.crewLabour.findMany({
      where: { date: { gte: startOfDay(selected), lte: endOfDay(selected) } },
      orderBy: { id: "asc" },
    }),
    getSettings(),
  ]);
  const currency = settings.currency;

  const doneCount = jobs.filter((j) => j.status === "DONE").length;
  const takings = jobs.filter((j) => j.status === "DONE").reduce((s, j) => s + j.price, 0);
  const wages = labour.reduce((s, l) => s + l.amount, 0);
  const profit = takings - wages;

  const groups: GroupInfo[] = [
    ...crews,
    ...(jobs.some((j) => j.crewId == null)
      ? [{ id: null, name: "Unassigned", colour: "#97a08e", members: "" }]
      : []),
  ];

  const boardJobs: BoardJob[] = jobs.map((j) => ({
    ...(j as unknown as JobRowData),
    crewId: j.crewId ?? null,
  }));
  const labourEntries: LabourEntry[] = labour.map((l) => ({
    id: l.id,
    crewId: l.crewId ?? null,
    name: l.name,
    amount: l.amount,
  }));

  return (
    <div className="space-y-4">
      <DayCrewBar date={dateStr} crews={crews} available={availableCrews} />
      <JobComposer
        date={dateStr}
        crews={crews}
        customers={customers}
        defaultHourlyRate={settings.employeeRate}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TillTile label="Done" value={`${doneCount}/${jobs.length}`} />
        <TillTile label="Takings" value={formatMoney(takings, currency)} accent />
        <TillTile
          label="Wages"
          value={wages > 0 ? `−${formatMoney(wages, currency)}` : formatMoney(0, currency)}
          negative={wages > 0}
        />
        <TillTile
          label="Profit today"
          value={formatMoney(profit, currency)}
          accent={profit >= 0}
          negative={profit < 0}
        />
      </div>

      <DayBoard
        date={dateStr}
        groups={groups}
        jobs={boardJobs}
        labour={labourEntries}
        currency={currency}
        defaultRate={settings.employeeRate}
      />
    </div>
  );
}

async function WeekView({
  selected,
  crews,
}: {
  selected: Date;
  crews: { id: number; name: string; colour: string }[];
}) {
  const weekStart = startOfWeek(selected);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  await materializeRecurring(weekStart, weekEnd);

  const jobs = await prisma.scheduledJob.findMany({
    where: { date: { gte: startOfDay(weekStart), lte: weekEnd } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekTakings = jobs
    .filter((j) => j.status === "DONE")
    .reduce((s, j) => s + j.price, 0);

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between p-4">
        <span className="eyebrow">Week takings so far</span>
        <span className="ledger font-display text-xl font-extrabold text-brand-900">
          {formatMoney(weekTakings)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day) => {
          const dayJobs = jobs.filter((j) => isSameDay(j.date, day));
          const done = dayJobs.filter((j) => j.status === "DONE");
          const takings = done.reduce((s, j) => s + j.price, 0);
          const isToday = isSameDay(day, new Date());
          return (
            <Link
              key={day.toISOString()}
              href={`/calendar?view=day&date=${toDateInput(day)}`}
              className={`card p-4 transition-colors hover:border-brand-300 ${
                isToday ? "ring-2 ring-lime-500/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-brand-900">
                  {formatDayShort(day)}
                </span>
                {isToday && <span className="badge bg-lime-100 text-lime-600">Today</span>}
              </div>
              <div className="ledger mt-2 text-3xl font-extrabold text-stone-900">
                {dayJobs.length}
              </div>
              <div className="text-xs text-stone-500">
                {done.length} done · <span className="ledger">{formatMoney(takings)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {crews.map((c) => {
                  const n = dayJobs.filter((j) => j.crewId === c.id).length;
                  if (n === 0) return null;
                  return (
                    <span
                      key={c.id}
                      className="badge text-stone-600"
                      style={{ background: c.colour + "22" }}
                    >
                      {c.name}: {n}
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TillTile({
  label,
  value,
  accent,
  muted,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="eyebrow">{label}</div>
      <div
        className={`ledger mt-1 text-lg sm:text-xl font-extrabold ${
          negative
            ? "text-clay-600"
            : accent
              ? "text-brand-700"
              : muted
                ? "text-stone-400"
                : "text-stone-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
