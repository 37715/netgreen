import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getRangeSummary, projectTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  endOfDay,
} from "@/lib/dates";
import { MarginBadge, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

type RangeKey = "week" | "month" | "year";

function resolveRange(key: RangeKey): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (key === "week") {
    const from = startOfWeek(now);
    return { from, to: endOfDay(addDays(from, 6)), label: "this week" };
  }
  if (key === "year") {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: endOfDay(new Date(now.getFullYear(), 11, 31)),
      label: "this year",
    };
  }
  return { from: startOfMonth(now), to: endOfMonth(now), label: "this month" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey = (["week", "month", "year"].includes(sp.range || "")
    ? sp.range
    : "month") as RangeKey;
  const { from, to, label } = resolveRange(rangeKey);

  const settings = await getSettings();
  const currency = settings.currency;
  const summary = await getRangeSummary(from, to);

  const projects = await prisma.project.findMany({
    include: { costs: true, payments: true, customer: true },
    orderBy: { createdAt: "desc" },
  });
  const withTotals = projects.map((p) => ({ p, t: projectTotals(p) }));
  const league = withTotals
    .filter((x) => x.t.margin !== null)
    .sort((a, b) => (b.t.margin ?? 0) - (a.t.margin ?? 0))
    .slice(0, 6);
  const outstanding = withTotals
    .filter((x) => x.t.outstanding > 0)
    .sort((a, b) => b.t.outstanding - a.t.outstanding);
  const totalOutstanding = outstanding.reduce((s, x) => s + x.t.outstanding, 0);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  const profitPositive = summary.profit >= 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="eyebrow">The numbers</div>
        <div className="flex rounded-xl border border-stone-200 bg-white p-1">
          {ranges.map((r) => (
            <Link
              key={r.key}
              href={`/?range=${r.key}`}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
                r.key === rangeKey
                  ? "bg-brand-700 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Money thesis hero */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-800 p-6 sm:p-8 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,181,24,0.35), transparent 70%)" }}
        />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-200">
            Profit · {label}
          </div>
          <div
            className={`ledger font-display mt-1 text-5xl sm:text-6xl font-extrabold leading-none ${
              profitPositive ? "text-lime-400" : "text-clay-500"
            }`}
          >
            {formatMoney(summary.profit, currency)}
          </div>
          <p className="mt-3 max-w-xl text-sm text-brand-100">
            You brought in{" "}
            <span className="ledger font-semibold text-white">
              {formatMoney(summary.revenue, currency)}
            </span>{" "}
            and spent{" "}
            <span className="ledger font-semibold text-white">
              {formatMoney(summary.costs, currency)}
            </span>{" "}
            on materials and overheads. That left{" "}
            <span className="font-semibold text-white">
              {formatMoney(summary.profit, currency)}
            </span>{" "}
            in {label} — across {summary.jobsDone} completed{" "}
            {summary.jobsDone === 1 ? "job" : "jobs"}.
          </p>
        </div>
      </div>

      {/* Money in / Money out — two separate ledgers */}
      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
        <div className="card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-lime-500" />
            <h2 className="font-display text-base font-bold text-brand-900">Money in</h2>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Maintenance & quick jobs" value={formatMoney(summary.quickIncome, currency)} />
            {summary.wasteIncome > 0 && (
              <SubRow
                label="incl. waste removal"
                value={formatMoney(summary.wasteIncome, currency)}
              />
            )}
            <Row label="Project payments" value={formatMoney(summary.projectIncome, currency)} />
          </dl>
          <div className="mt-auto pt-4">
            <Total label="Revenue" value={formatMoney(summary.revenue, currency)} />
          </div>
        </div>

        <div className="card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-clay-500" />
            <h2 className="font-display text-base font-bold text-brand-900">Money out</h2>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Overheads" value={formatMoney(summary.overheadCosts, currency)} />
            <Row label="Project materials & costs" value={formatMoney(summary.projectCosts, currency)} />
            <Row label="Extra crew wages" value={formatMoney(summary.labourCosts, currency)} />
          </dl>
          <div className="mt-auto pt-4">
            <Total label="Costs" value={formatMoney(summary.costs, currency)} />
          </div>
        </div>
      </div>

      {/* Profit reconciliation */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-5 py-4">
        <div>
          <div className="font-display font-bold text-brand-900">Profit</div>
          <div className="text-xs text-stone-500">
            Revenue {formatMoney(summary.revenue, currency)} − Costs{" "}
            {formatMoney(summary.costs, currency)}
          </div>
        </div>
        <span
          className={`ledger text-2xl font-extrabold ${
            profitPositive ? "text-brand-700" : "text-clay-600"
          }`}
        >
          {formatMoney(summary.profit, currency)}
        </span>
      </div>

      {/* Project insights */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-brand-900">
              Best margins
            </h2>
            <Link href="/projects" className="text-xs font-semibold text-brand-700 hover:underline">
              All projects
            </Link>
          </div>
          {league.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              No project figures yet. Add a project and its margin shows here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {league.map(({ p, t }) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-stone-800">
                        {p.title}
                      </div>
                      <div className="ledger text-xs text-stone-500">
                        {formatMoney(t.profit, currency)} profit
                      </div>
                    </div>
                    <MarginBadge margin={t.margin} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-brand-900">
              Still owed
            </h2>
            <span className="ledger text-sm font-bold text-clay-600">
              {formatMoney(totalOutstanding, currency)}
            </span>
          </div>
          {outstanding.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              Nobody owes you right now. Nice.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {outstanding.slice(0, 5).map(({ p, t }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="truncate text-sm font-semibold text-stone-800 hover:underline">
                      {p.title}
                    </Link>
                    <div className="text-xs text-stone-400">
                      {p.customer?.name ?? "No customer"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="ledger text-sm font-bold text-stone-900">
                      {formatMoney(t.outstanding, currency)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-stone-600">{label}</dt>
      <dd className="ledger text-stone-700">{value}</dd>
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between pl-4 text-xs">
      <dt className="text-stone-400">{label}</dt>
      <dd className="ledger text-stone-400">{value}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-stone-100 pt-2.5">
      <dt className="font-display font-bold text-stone-900">{label}</dt>
      <dd className="ledger font-bold text-stone-900">{value}</dd>
    </div>
  );
}
