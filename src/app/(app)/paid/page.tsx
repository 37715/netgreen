import Link from "next/link";
import { prisma } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurrence";
import { formatMoney } from "@/lib/money";
import {
  startOfDay,
  endOfDay,
  addDays,
  toDateInput,
  fromDateInput,
  isSameDay,
  formatDayLabel,
} from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { setJobStatus, setJobPayment, markCustomerJobsPaid } from "@/app/actions/jobs";
import { Collapsible } from "@/components/Collapsible";
import { JobsTabs } from "@/components/JobsTabs";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type PayJob = {
  id: number;
  date: Date;
  title: string;
  price: number;
  status: "SCHEDULED" | "DONE" | "SKIPPED";
  paidAt: Date | null;
  paymentMethod: "CASH" | "BANK" | null;
  customer: { id: number; name: string } | null;
};

export default async function PaidPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const selected = sp.date ? fromDateInput(sp.date) : startOfDay(new Date());

  await materializeRecurring(selected, selected);

  const settings = await getSettings();
  const currency = settings.currency;

  const [dayJobs, owedJobs, dayLabour] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { date: { gte: startOfDay(selected), lte: endOfDay(selected) } },
      select: {
        id: true,
        date: true,
        title: true,
        price: true,
        materialsPaid: true,
        status: true,
        paidAt: true,
        paymentMethod: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    // Everyone who has had the work done but hasn't paid — all time.
    prisma.scheduledJob.findMany({
      where: { status: "DONE", paidAt: null, price: { gt: 0 } },
      select: {
        id: true,
        date: true,
        title: true,
        price: true,
        status: true,
        paidAt: true,
        paymentMethod: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    // Extra hands paid on this day — a real cost that comes out of the takings.
    prisma.crewLabour.findMany({
      where: { date: { gte: startOfDay(selected), lte: endOfDay(selected) } },
      select: { amount: true },
    }),
  ]);

  const incomeJobs = dayJobs.filter((j) => j.price > 0);
  const worked = dayJobs
    .filter((j) => j.status === "DONE")
    .reduce((s, j) => s + j.price, 0);
  const paidJobs = dayJobs.filter((j) => j.paidAt);
  const collected = paidJobs.reduce((s, j) => s + j.price, 0);
  const outstanding = worked - collected;

  // What today actually made: money collected, minus the wages you paid the
  // extra hands and any materials you bought for the jobs you got paid for.
  const wages = dayLabour.reduce((s, l) => s + l.amount, 0);
  const materials = paidJobs.reduce((s, j) => s + (j.materialsPaid ?? 0), 0);
  const profit = collected - wages - materials;

  // Group the all-time owed jobs by customer (plus a no-customer bucket).
  const groups = new Map<
    string,
    { customerId: number | null; name: string; jobs: PayJob[]; total: number }
  >();
  for (const j of owedJobs) {
    const key = j.customer ? `c${j.customer.id}` : "none";
    const g =
      groups.get(key) ??
      {
        customerId: j.customer?.id ?? null,
        name: j.customer?.name ?? "One-off / cash jobs",
        jobs: [] as PayJob[],
        total: 0,
      };
    g.jobs.push(j);
    g.total += j.price;
    groups.set(key, g);
  }
  // Oldest debt first — chase the ones that have been waiting longest.
  const owedGroups = [...groups.values()].sort(
    (a, b) => a.jobs[0].date.getTime() - b.jobs[0].date.getTime()
  );
  const totalOwed = owedJobs.reduce((s, j) => s + j.price, 0);

  const prev = toDateInput(addDays(selected, -1));
  const next = toDateInput(addDays(selected, 1));
  const today = toDateInput(new Date());
  const isToday = isSameDay(selected, new Date());

  return (
    <div className="space-y-4">
      <JobsTabs date={toDateInput(selected)} />

      {/* Day picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Who&rsquo;s paid</div>
          <div className="mt-0.5 flex items-center gap-1">
            <Link
              href={`/paid?date=${prev}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
              aria-label="Previous day"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-900">
              {isToday ? "Today" : formatDayLabel(selected)}
            </h1>
            <Link
              href={`/paid?date=${next}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
              aria-label="Next day"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
            {!isToday && (
              <Link href={`/paid?date=${today}`} className="btn-ghost ml-1">
                Today
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Day totals */}
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Worked" value={formatMoney(worked, currency)} />
        <Tile label="Collected" value={formatMoney(collected, currency)} accent />
        <Tile
          label="Still due"
          value={formatMoney(outstanding, currency)}
          negative={outstanding > 0}
        />
      </div>

      {/* What you actually made today, after paying the extra hands */}
      <div className="card flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="eyebrow">Profit {isToday ? "today" : "that day"}</div>
          <p className="mt-0.5 text-xs text-stone-500">
            Collected {formatMoney(collected, currency)}
            {wages > 0 && ` − wages ${formatMoney(wages, currency)}`}
            {materials > 0 && ` − materials ${formatMoney(materials, currency)}`}
          </p>
        </div>
        <span
          className={`ledger sum shrink-0 text-2xl font-extrabold ${
            profit >= 0 ? "text-brand-700" : "text-clay-600"
          }`}
        >
          {formatMoney(profit, currency)}
        </span>
      </div>

      {/* The day's jobs */}
      <div className="card overflow-hidden">
        <div className="border-b border-stone-100 px-4 pt-3.5 pb-2.5">
          <h2 className="font-display text-base font-bold text-brand-900">
            {isToday ? "Today's jobs" : `${formatDayLabel(selected)}'s jobs`}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Tick off the work, then tap how the money came in — cash or bank.
          </p>
        </div>
        {incomeJobs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-400">
            No paid jobs on this day.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 px-4">
            {incomeJobs.map((j) => (
              <DayRow key={j.id} job={j} currency={currency} />
            ))}
          </div>
        )}
      </div>

      {/* Everyone who still owes — the safety net so nobody slips through */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="eyebrow">Still owed · all time</div>
          <span className="ledger text-lg font-extrabold text-clay-600">
            {formatMoney(totalOwed, currency)}
          </span>
        </div>

        {owedGroups.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-display text-base font-bold text-stone-800">
              Everyone&rsquo;s square. 🎉
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Every completed job has been marked paid.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-stone-400">
              Every done-but-unpaid job, oldest first. When someone pays a lump
              for several visits, open them and tap <b>Mark all paid</b>. Cash
              customers you&rsquo;ve already settled: just tick them off.
            </p>
            <div className="space-y-2">
              {owedGroups.map((g) => (
                <Collapsible
                  key={g.customerId ?? "none"}
                  label={`${g.name} · ${formatMoney(g.total, currency)} · ${
                    g.jobs.length
                  } ${g.jobs.length === 1 ? "visit" : "visits"}`}
                >
                  <div className="divide-y divide-stone-100">
                    {g.jobs.map((j) => (
                      <OwedRow key={j.id} job={j} currency={currency} />
                    ))}
                  </div>
                  {g.customerId != null && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                      <form action={markCustomerJobsPaid}>
                        <input type="hidden" name="customerId" value={g.customerId} />
                        <input type="hidden" name="method" value="BANK" />
                        <button type="submit" className="btn-secondary !py-1.5 !text-sm">
                          Mark all paid (bank)
                        </button>
                      </form>
                      <form action={markCustomerJobsPaid}>
                        <input type="hidden" name="customerId" value={g.customerId} />
                        <input type="hidden" name="method" value="CASH" />
                        <button type="submit" className="btn-ghost !py-1.5 !text-sm">
                          All cash
                        </button>
                      </form>
                      <Link
                        href={`/customers/${g.customerId}/invoice`}
                        className="ml-auto text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Invoice →
                      </Link>
                    </div>
                  )}
                </Collapsible>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="eyebrow">{label}</div>
      <div
        className={`ledger mt-1 text-lg sm:text-xl font-extrabold ${
          negative ? "text-clay-600" : accent ? "text-brand-700" : "text-stone-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DoneTick({ id, done }: { id: number; done: boolean }) {
  return (
    <form action={setJobStatus} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={done ? "SCHEDULED" : "DONE"} />
      <button
        type="submit"
        aria-label={done ? "Mark not done" : "Mark done"}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-colors ${
          done
            ? "border-lime-500 bg-lime-500 text-white"
            : "border-stone-300 text-transparent hover:border-lime-500 active:bg-lime-100"
        }`}
      >
        <CheckIcon className="h-4 w-4" />
      </button>
    </form>
  );
}

function PayControl({ job }: { job: PayJob }) {
  if (job.status !== "DONE") {
    return <span className="text-[11px] font-semibold text-stone-300">not done</span>;
  }
  if (job.price <= 0) return null;

  if (job.paidAt) {
    return (
      <form action={setJobPayment}>
        <input type="hidden" name="id" value={job.id} />
        <input type="hidden" name="method" value="UNPAID" />
        <button
          type="submit"
          title="Tap to mark unpaid"
          className="rounded-lg bg-lime-100 px-2.5 py-1.5 text-xs font-bold text-lime-700"
        >
          Paid
          {job.paymentMethod ? ` · ${job.paymentMethod === "CASH" ? "cash" : "bank"}` : ""}
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {(["CASH", "BANK"] as const).map((m) => (
        <form key={m} action={setJobPayment}>
          <input type="hidden" name="id" value={job.id} />
          <input type="hidden" name="method" value={m} />
          <button
            type="submit"
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:border-brand-400 hover:bg-brand-50"
          >
            {m === "CASH" ? "Cash" : "Bank"}
          </button>
        </form>
      ))}
    </div>
  );
}

function DayRow({ job, currency }: { job: PayJob; currency: string }) {
  const done = job.status === "DONE";
  return (
    <div className="flex items-center gap-3 py-2.5">
      <DoneTick id={job.id} done={done} />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-semibold ${
            done ? "text-stone-800" : "text-stone-500"
          }`}
        >
          {job.title}
        </div>
        {job.customer && (
          <div className="truncate text-xs text-stone-400">{job.customer.name}</div>
        )}
      </div>
      <span className="ledger shrink-0 text-sm font-semibold tabular-nums text-stone-700">
        {formatMoney(job.price, currency)}
      </span>
      <div className="shrink-0">
        <PayControl job={job} />
      </div>
    </div>
  );
}

function OwedRow({ job, currency }: { job: PayJob; currency: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-stone-800">
          {job.title}
        </div>
        <div className="text-xs text-stone-400">{formatDayLabel(job.date)}</div>
      </div>
      <span className="ledger shrink-0 text-sm font-semibold tabular-nums text-stone-700">
        {formatMoney(job.price, currency)}
      </span>
      <div className="shrink-0">
        <PayControl job={job} />
      </div>
    </div>
  );
}
