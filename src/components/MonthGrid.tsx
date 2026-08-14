import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { CheckIcon } from "@/components/icons";
import type { WeekCrew, WeekJob } from "@/components/WeekGrid";

const UNASSIGNED_COLOUR = "#97a08e";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISIBLE_JOBS = 3;

export type MonthDay = {
  dateStr: string;
  dayNumber: string;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  jobs: WeekJob[];
};

export function MonthGrid({
  days,
  crews,
  currency,
}: {
  days: MonthDay[];
  crews: WeekCrew[];
  currency?: string;
}) {
  const hasUnassigned = days.some((d) => d.jobs.some((j) => j.crewName === null));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow">Crews</span>
          {crews.length === 0 && !hasUnassigned ? (
            <span className="text-xs font-semibold text-stone-400">
              None on this month
            </span>
          ) : (
            crews.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c.colour }}
                />
                {c.name}
              </span>
            ))
          )}
          {hasUnassigned && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: UNASSIGNED_COLOUR }}
              />
              Unassigned
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-stone-400 md:hidden">
          Swipe to see the month →
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[52rem] md:min-w-0">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <MonthCell key={day.dateStr} day={day} currency={currency} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthCell({ day, currency }: { day: MonthDay; currency?: string }) {
  const href = `/calendar?view=day&date=${day.dateStr}`;
  const done = day.jobs.filter((j) => j.status === "DONE");
  const takings = done.reduce((s, j) => s + j.price, 0);
  const visible = day.jobs.slice(0, VISIBLE_JOBS);
  const extra = day.jobs.length - visible.length;

  return (
    <Link
      href={href}
      className={`group flex min-h-[7.5rem] flex-col border-b border-l border-stone-200 p-1.5 hover:bg-stone-100/60 sm:min-h-[9.5rem] [&:nth-child(7n+1)]:border-l-0 ${
        day.isToday
          ? "bg-lime-100/50"
          : !day.isCurrentMonth
            ? "bg-stone-50/80"
            : day.isPast
              ? "bg-stone-50/40"
              : "bg-white"
      }`}
    >
      <span className="flex items-center justify-between gap-1 px-0.5">
        {day.isToday ? (
          <span className="ledger inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1 text-[13px] font-extrabold text-white">
            {day.dayNumber}
          </span>
        ) : (
          <span
            className={`ledger text-[13px] font-extrabold ${
              day.isCurrentMonth ? "text-stone-800" : "text-stone-300"
            }`}
          >
            {day.dayNumber}
          </span>
        )}
        {day.jobs.length > 0 && (
          <span
            className={`text-[10px] font-bold ${
              day.isCurrentMonth ? "text-stone-400" : "text-stone-300"
            }`}
          >
            {done.length}/{day.jobs.length}
          </span>
        )}
      </span>

      <span className="mt-1 flex flex-1 flex-col gap-0.5">
        {visible.map((job) => (
          <MonthChip key={job.id} job={job} muted={!day.isCurrentMonth} />
        ))}
        {extra > 0 && (
          <span className="px-1 text-[10px] font-semibold text-stone-400 group-hover:text-brand-700">
            +{extra} more
          </span>
        )}
      </span>

      {takings > 0 && (
        <span
          className={`ledger mt-auto px-0.5 pt-1 text-right text-[10px] font-bold ${
            day.isCurrentMonth ? "text-brand-700" : "text-stone-300"
          }`}
        >
          {formatMoney(takings, currency)}
        </span>
      )}
    </Link>
  );
}

function MonthChip({ job, muted }: { job: WeekJob; muted: boolean }) {
  const colour = job.crewColour ?? UNASSIGNED_COLOUR;
  const done = job.status === "DONE";
  const skipped = job.status === "SKIPPED";

  return (
    <span
      className={`flex items-center gap-1 rounded-md border-l-2 px-1 py-0.5 ${
        skipped ? "opacity-50" : ""
      }`}
      style={{
        borderLeftColor: colour,
        background: muted ? `${colour}10` : `${colour}24`,
        borderLeftStyle: skipped ? "dashed" : "solid",
      }}
    >
      <span
        className={`min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight ${
          done ? "text-stone-400 line-through" : muted ? "text-stone-400" : "text-stone-800"
        }`}
      >
        {job.title}
      </span>
      {done && <CheckIcon className="h-2.5 w-2.5 shrink-0 text-lime-600" />}
    </span>
  );
}
