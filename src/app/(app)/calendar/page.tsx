import Link from "next/link";
import { prisma } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurrence";
import {
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  toDateInput,
  fromDateInput,
  isSameDay,
  isSameMonth,
  formatDayLabel,
  formatWeekdayShort,
  formatDayNumber,
  formatMonthShort,
  formatWeekRange,
  formatMonthYear,
  daysBetween,
  toStoredDay,
} from "@/lib/dates";
import { JobRowData } from "@/components/JobRow";
import { WeekGrid, WeekDay, WeekCrew } from "@/components/WeekGrid";
import { MonthGrid, MonthDay } from "@/components/MonthGrid";
import { DayBoard, GroupInfo, BoardJob, LabourEntry } from "@/components/DayBoard";
import { JobComposer } from "@/components/JobComposer";
import { JobsTabs } from "@/components/JobsTabs";
import { DayCrewBar } from "@/components/DayCrewBar";
import { RainBump } from "@/components/RainBump";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { getCrewsForDay, getCrewsAvailableToAdd } from "@/lib/day-crews";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type CalView = "day" | "week" | "month";

function parseView(value?: string): CalView {
  if (value === "week" || value === "month") return value;
  return "day";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const selected = sp.date ? fromDateInput(sp.date) : startOfDay(new Date());
  const view = parseView(sp.view);

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
      <JobsTabs date={toDateInput(selected)} />
      <CalendarHeader selected={selected} view={view} />
      {view === "day" ? (
        <DayView selected={selected} customers={customers} />
      ) : view === "week" ? (
        <WeekView selected={selected} />
      ) : (
        <MonthView selected={selected} />
      )}
    </div>
  );
}

function CalendarHeader({ selected, view }: { selected: Date; view: CalView }) {
  const now = new Date();
  const today = toDateInput(now);
  const prev =
    view === "month"
      ? toDateInput(addMonths(selected, -1))
      : toDateInput(addDays(selected, view === "week" ? -7 : -1));
  const next =
    view === "month"
      ? toDateInput(addMonths(selected, 1))
      : toDateInput(addDays(selected, view === "week" ? 7 : 1));

  const onThisPeriod =
    view === "month"
      ? isSameMonth(selected, now)
      : view === "week"
        ? isSameDay(startOfWeek(selected), startOfWeek(now))
        : isSameDay(selected, now);

  const jumpLabel =
    view === "month" ? "This month" : view === "week" ? "This week" : "Today";
  const eyebrow =
    view === "month"
      ? onThisPeriod
        ? "This month"
        : "Month"
      : view === "week"
        ? onThisPeriod
          ? "This week"
          : "Week"
        : onThisPeriod
          ? "Today"
          : "Day";
  const label =
    view === "month"
      ? formatMonthYear(selected)
      : view === "week"
        ? formatWeekRange(startOfWeek(selected), addDays(startOfWeek(selected), 6))
        : formatDayLabel(selected);

  const views: { key: CalView; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];

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
          {!onThisPeriod && (
            <Link href={`/calendar?view=${view}&date=${today}`} className="btn-ghost ml-1">
              {jumpLabel}
            </Link>
          )}
        </div>
      </div>
      <div className="flex rounded-xl border border-stone-200 bg-white p-1">
        {views.map((v) => (
          <Link
            key={v.key}
            href={`/calendar?view=${v.key}&date=${toDateInput(selected)}`}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
              view === v.key
                ? "bg-brand-700 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {v.label}
          </Link>
        ))}
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

      <div className="stat-card flex items-center justify-between">
        <div>
          <div className="eyebrow">Done today</div>
          <p className="mt-0.5 text-xs text-stone-500">
            Money&rsquo;s tracked on the Paid tab.
          </p>
        </div>
        <span className="ledger text-xl font-extrabold text-brand-900">
          {doneCount}
          <span className="text-stone-400">/{jobs.length}</span>
        </span>
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

  const [jobs, settings] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { date: { gte: startOfDay(weekStart), lte: weekEnd } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        customer: { select: { name: true } },
        crew: { select: { id: true, name: true, colour: true } },
      },
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

  const doneCount = jobs.filter((j) => j.status === "DONE").length;

  return (
    <div className="space-y-4">
      <div className="stat-card flex items-center justify-between">
        <div className="eyebrow">Done this week</div>
        <span className="ledger text-xl font-extrabold text-brand-900">
          {doneCount}
          <span className="text-stone-400">/{jobs.length}</span>
        </span>
      </div>

      <WeekGrid days={days} crews={weekCrews} currency={currency} />
    </div>
  );
}

function jobsToWeekJobs(
  jobs: {
    id: number;
    title: string;
    price: number;
    status: "SCHEDULED" | "DONE" | "SKIPPED";
    customer: { name: string } | null;
    crew: { id: number; name: string; colour: string } | null;
  }[]
) {
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    price: j.price,
    status: j.status,
    crewName: j.crew?.name ?? null,
    crewColour: j.crew?.colour ?? null,
    customerName: j.customer?.name ?? null,
  }));
}

function crewsFromJobs(
  jobs: { crew: { id: number; name: string; colour: string } | null }[]
): WeekCrew[] {
  const crews: WeekCrew[] = [];
  for (const j of jobs) {
    if (j.crew && !crews.some((c) => c.id === j.crew!.id)) {
      crews.push({ id: j.crew.id, name: j.crew.name, colour: j.crew.colour });
    }
  }
  return crews;
}

async function MonthView({ selected }: { selected: Date }) {
  const monthStart = startOfMonth(selected);
  const monthEnd = endOfMonth(selected);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(toStoredDay(monthEnd)), 6);
  await materializeRecurring(gridStart, gridEnd);

  const [jobs, settings] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { date: { gte: startOfDay(gridStart), lte: endOfDay(gridEnd) } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        customer: { select: { name: true } },
        crew: { select: { id: true, name: true, colour: true } },
      },
    }),
    getSettings(),
  ]);
  const currency = settings.currency;
  const today = new Date();
  const dayCount = daysBetween(gridStart, gridEnd) + 1;

  const days: MonthDay[] = Array.from({ length: dayCount }, (_, i) => {
    const day = addDays(gridStart, i);
    const dayJobs = jobs.filter((j) => isSameDay(j.date, day));
    return {
      dateStr: toDateInput(day),
      dayNumber: formatDayNumber(day),
      isToday: isSameDay(day, today),
      isPast: day < startOfDay(today),
      isCurrentMonth: isSameMonth(day, monthStart),
      jobs: jobsToWeekJobs(dayJobs),
    };
  });

  const monthJobs = jobs.filter((j) => isSameMonth(j.date, monthStart));
  const doneCount = monthJobs.filter((j) => j.status === "DONE").length;

  return (
    <div className="space-y-4">
      <div className="stat-card flex items-center justify-between">
        <div className="eyebrow">Done this month</div>
        <span className="ledger text-xl font-extrabold text-brand-900">
          {doneCount}
          <span className="text-stone-400">/{monthJobs.length}</span>
        </span>
      </div>

      <MonthGrid
        days={days}
        crews={crewsFromJobs(jobs)}
        currency={currency}
      />
    </div>
  );
}

