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
  formatWeekdayShort,
  formatDayNumber,
  formatMonthShort,
  formatWeekRange,
} from "@/lib/dates";
import { JobRowData } from "@/components/JobRow";
import { WeekGrid, WeekDay, WeekCrew } from "@/components/WeekGrid";
import { DayBoard, GroupInfo, BoardJob, LabourEntry } from "@/components/DayBoard";
import { JobComposer } from "@/components/JobComposer";
import { DayCrewBar } from "@/components/DayCrewBar";
import { RainBump } from "@/components/RainBump";
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

  const customers =
    view === "day"
      ? await prisma.customer.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            name: true,
            address: true,
            defaultPrice: true,
            defaultCrewId: true,
          },
        })
      : [];

  return (
    <div>
      <CalendarHeader selected={selected} view={view} />
      {view === "day" ? (
        <DayView selected={selected} customers={customers} />
      ) : (
        <WeekView selected={selected} />
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
  const weekStart = startOfWeek(selected);
  const thisWeek = isSameDay(weekStart, startOfWeek(new Date()));
  const eyebrow =
    view === "week" ? (thisWeek ? "This week" : "Week") : isToday ? "Today" : "Day";
  const label =
    view === "week"
      ? formatWeekRange(weekStart, addDays(weekStart, 6))
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
          {!(view === "week" ? thisWeek : isToday) && (
            <Link href={`/calendar?view=${view}&date=${today}`} className="btn-ghost ml-1">
              {view === "week" ? "This week" : "Today"}
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

  const doneJobs = jobs.filter((j) => j.status === "DONE");
  const doneCount = doneJobs.length;
  const takings = doneJobs.reduce((s, j) => s + j.price, 0);
  const wages = labour.reduce((s, l) => s + l.amount, 0);
  const materialsPaid = doneJobs.reduce((s, j) => s + (j.materialsPaid ?? 0), 0);
  const costsToday = wages + materialsPaid;
  const profit = takings - costsToday;

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

      {(() => {
        const stops = jobs
          .filter((j) => j.status === "SCHEDULED" && j.customer?.address)
          .map((j) => j.customer!.address as string);
        if (stops.length < 1) return null;
        const url = `https://www.google.com/maps/dir/${stops
          .map((a) => encodeURIComponent(a))
          .join("/")}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex items-center justify-between gap-3 p-3.5 hover:border-brand-300"
          >
            <span className="text-sm font-semibold text-stone-800">
              Today&apos;s route · {stops.length} {stops.length === 1 ? "stop" : "stops"}
            </span>
            <span className="text-xs font-bold text-brand-700">Open in Google Maps →</span>
          </a>
        );
      })()}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TillTile label="Done" value={`${doneCount}/${jobs.length}`} />
        <TillTile label="Takings" value={formatMoney(takings, currency)} accent />
        <TillTile
          label="Costs"
          value={
            costsToday > 0
              ? `−${formatMoney(costsToday, currency)}`
              : formatMoney(0, currency)
          }
          negative={costsToday > 0}
        />
        <TillTile
          label="Profit today"
          value={formatMoney(profit, currency)}
          accent={profit >= 0}
          negative={profit < 0}
          sum
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

      <RainBump
        date={dateStr}
        remaining={jobs.filter((j) => j.status === "SCHEDULED").length}
      />
    </div>
  );
}

async function WeekView({ selected }: { selected: Date }) {
  const weekStart = startOfWeek(selected);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  await materializeRecurring(weekStart, weekEnd);

  const [jobs, labour, settings] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { date: { gte: startOfDay(weekStart), lte: weekEnd } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        customer: { select: { name: true } },
        crew: { select: { id: true, name: true, colour: true } },
      },
    }),
    prisma.crewLabour.findMany({
      where: { date: { gte: startOfDay(weekStart), lte: weekEnd } },
    }),
    getSettings(),
  ]);
  const currency = settings.currency;

  const today = new Date();
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayJobs = jobs.filter((j) => isSameDay(j.date, day));
    return {
      dateStr: toDateInput(day),
      weekday: formatWeekdayShort(day),
      dayNumber: formatDayNumber(day),
      monthLabel: formatMonthShort(day),
      showMonth: i === 0 || formatDayNumber(day) === "1",
      isToday: isSameDay(day, today),
      isPast: day < startOfDay(today),
      jobs: dayJobs.map((j) => ({
        id: j.id,
        title: j.title,
        price: j.price,
        status: j.status,
        crewName: j.crew?.name ?? null,
        crewColour: j.crew?.colour ?? null,
        customerName: j.customer?.name ?? null,
      })),
    };
  });

  const weekCrews: WeekCrew[] = [];
  for (const j of jobs) {
    if (j.crew && !weekCrews.some((c) => c.id === j.crew!.id)) {
      weekCrews.push({ id: j.crew.id, name: j.crew.name, colour: j.crew.colour });
    }
  }

  const doneJobs = jobs.filter((j) => j.status === "DONE");
  const takings = doneJobs.reduce((s, j) => s + j.price, 0);
  const wages = labour.reduce((s, l) => s + l.amount, 0);
  const materialsPaid = doneJobs.reduce((s, j) => s + (j.materialsPaid ?? 0), 0);
  const costs = wages + materialsPaid;
  const profit = takings - costs;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TillTile label="Done" value={`${doneJobs.length}/${jobs.length}`} />
        <TillTile label="Takings" value={formatMoney(takings, currency)} accent />
        <TillTile
          label="Costs"
          value={
            costs > 0 ? `−${formatMoney(costs, currency)}` : formatMoney(0, currency)
          }
          negative={costs > 0}
        />
        <TillTile
          label="Profit this week"
          value={formatMoney(profit, currency)}
          accent={profit >= 0}
          negative={profit < 0}
          sum
        />
      </div>

      <WeekGrid days={days} crews={weekCrews} currency={currency} />
    </div>
  );
}

function TillTile({
  label,
  value,
  accent,
  muted,
  negative,
  sum,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  negative?: boolean;
  sum?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="eyebrow">{label}</div>
      <div className="mt-1">
        <span
          className={`ledger text-lg sm:text-xl font-extrabold ${sum ? "sum" : ""} ${
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
        </span>
      </div>
    </div>
  );
}
