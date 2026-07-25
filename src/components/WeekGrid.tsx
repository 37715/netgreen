import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { CheckIcon, PlusIcon } from "@/components/icons";

const UNASSIGNED_COLOUR = "#97a08e";

export type WeekJob = {
  id: number;
  title: string;
  price: number;
  status: "SCHEDULED" | "DONE" | "SKIPPED";
  crewName: string | null;
  crewColour: string | null;
  customerName: string | null;
};

export type WeekDay = {
  dateStr: string;
  weekday: string;
  dayNumber: string;
  monthLabel: string;
  showMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  jobs: WeekJob[];
};

export type WeekCrew = { id: number; name: string; colour: string };

export function WeekGrid({
  days,
  crews,
  currency,
}: {
  days: WeekDay[];
  crews: WeekCrew[];
  currency?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow">Crews</span>
          {crews.length === 0 ? (
            <span className="text-xs font-semibold text-stone-400">
              None on this week
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
          {days.some((d) => d.jobs.some((j) => j.crewName === null)) && (
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
          Swipe for more days →
        </span>
      </div>

      <div className="flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-7 md:overflow-x-visible">
        {days.map((day) => (
          <DayColumn key={day.dateStr} day={day} currency={currency} />
        ))}
      </div>
    </div>
  );
}

function DayColumn({ day, currency }: { day: WeekDay; currency?: string }) {
  const dayHref = `/calendar?view=day&date=${day.dateStr}`;
  const done = day.jobs.filter((j) => j.status === "DONE");
  const takings = done.reduce((s, j) => s + j.price, 0);
  const booked = day.jobs
    .filter((j) => j.status !== "SKIPPED")
    .reduce((s, j) => s + j.price, 0);
  const outstanding = booked - takings;

  return (
    <div
      className={`flex w-[11.5rem] shrink-0 snap-start flex-col border-l border-stone-200 first:border-l-0 md:w-auto ${
        day.isToday ? "bg-lime-100/50" : day.isPast ? "bg-stone-50/60" : ""
      }`}
    >
      <Link
        href={dayHref}
        className="group flex items-center justify-between gap-2 border-b border-stone-200 px-3 py-2.5 hover:bg-stone-100/70"
      >
        <span className="flex items-baseline gap-1.5">
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
              day.isToday ? "text-brand-700" : "text-stone-500"
            }`}
          >
            {day.weekday}
          </span>
          {day.isToday ? (
            <span className="ledger inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-700 px-1.5 text-[15px] font-extrabold text-white">
              {day.dayNumber}
            </span>
          ) : (
            <span className="ledger text-lg font-extrabold text-stone-900">
              {day.dayNumber}
            </span>
          )}
          {day.showMonth && (
            <span className="text-[11px] font-semibold text-stone-400">
              {day.monthLabel}
            </span>
          )}
        </span>
        {day.jobs.length > 0 ? (
          <span className="badge bg-stone-100 text-stone-600">
            {done.length}/{day.jobs.length}
          </span>
        ) : (
          <PlusIcon className="h-4 w-4 text-stone-300 group-hover:text-brand-700" />
        )}
      </Link>

      <div className="flex min-h-[15rem] flex-1 flex-col gap-1 p-1.5 md:min-h-[24rem]">
        {day.jobs.length === 0 ? (
          <Link
            href={dayHref}
            className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-stone-200 text-[11px] font-semibold text-stone-400 hover:border-brand-300 hover:text-brand-700"
          >
            Add a job
          </Link>
        ) : (
          day.jobs.map((job, i) => (
            <JobChip
              key={job.id}
              job={job}
              index={i + 1}
              href={dayHref}
              currency={currency}
            />
          ))
        )}
      </div>

      <div className="flex items-baseline justify-between gap-1 border-t border-dashed border-stone-300 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
          Took
        </span>
        <span className="text-right">
          <span
            className={`ledger block text-[13px] font-extrabold ${
              takings > 0 ? "text-brand-700" : "text-stone-300"
            }`}
          >
            {formatMoney(takings, currency)}
          </span>
          {outstanding > 0 && (
            <span className="ledger block text-[10px] text-stone-400">
              {formatMoney(outstanding, currency)} to go
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function JobChip({
  job,
  index,
  href,
  currency,
}: {
  job: WeekJob;
  index: number;
  href: string;
  currency?: string;
}) {
  const colour = job.crewColour ?? UNASSIGNED_COLOUR;
  const done = job.status === "DONE";
  const skipped = job.status === "SKIPPED";
  const sameAsTitle =
    job.customerName?.trim().toLowerCase() === job.title.trim().toLowerCase();
  const sub = skipped
    ? "Rained off"
    : (job.crewName ??
      (job.customerName && !sameAsTitle ? job.customerName : null));

  return (
    <Link
      href={href}
      className={`block rounded-xl border-l-[3px] px-2 py-1.5 transition-colors hover:bg-white ${
        skipped ? "opacity-60" : ""
      }`}
      style={{
        borderLeftColor: colour,
        background: `${colour}1f`,
        borderLeftStyle: skipped ? "dashed" : "solid",
      }}
    >
      <span className="flex items-start gap-1.5">
        <span className="ledger mt-px text-[10px] font-bold text-stone-400">
          {index}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug ${
            done ? "text-stone-400 line-through" : "text-stone-800"
          }`}
        >
          {job.title}
        </span>
        {!sub && job.price > 0 && (
          <span
            className={`ledger shrink-0 text-[11px] font-bold ${
              done ? "text-brand-700" : "text-stone-500"
            }`}
          >
            {formatMoney(job.price, currency)}
          </span>
        )}
        {done && (
          <CheckIcon className="mt-px h-3.5 w-3.5 shrink-0 text-lime-600" />
        )}
      </span>
      {sub && (
        <span className="mt-0.5 flex items-baseline justify-between gap-1.5 pl-[1.15rem]">
          <span className="truncate text-[10px] font-medium text-stone-500">
            {sub}
          </span>
          {job.price > 0 && (
            <span
              className={`ledger shrink-0 text-[11px] font-bold ${
                done ? "text-brand-700" : "text-stone-500"
              }`}
            >
              {formatMoney(job.price, currency)}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
