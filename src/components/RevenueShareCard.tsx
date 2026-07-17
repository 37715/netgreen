import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { RevenueSharePayout } from "@/lib/finance";

export function RevenueShareCard({
  payouts,
  currency,
  rangeLabel,
}: {
  payouts: RevenueSharePayout[];
  currency: string;
  rangeLabel: string;
}) {
  if (payouts.length === 0) {
    return (
      <div className="mt-4 card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-brand-900">
              Revenue share
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Pay someone a % of labour takings from a tagged customer book.
            </p>
          </div>
          <Link
            href="/revenue-share"
            className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
          >
            Set up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {payouts.map((p) => (
        <div key={p.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                Revenue share · {rangeLabel}
              </div>
              <h2 className="font-display text-base font-bold text-brand-900">
                {p.name}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {p.percent}% of labour takings · {p.customerCount}{" "}
                {p.customerCount === 1 ? "customer" : "customers"} · {p.jobs}{" "}
                {p.jobs === 1 ? "job" : "jobs"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="ledger sum text-2xl font-extrabold text-clay-600">
                {formatMoney(p.shareOwed, currency)}
              </div>
              <div className="text-xs text-stone-400">
                on {formatMoney(p.labourTakings, currency)} labour
              </div>
            </div>
          </div>

          {p.lines.length > 0 ? (
            <ul className="mt-3 divide-y divide-stone-100">
              {p.lines.slice(0, 8).map((line) => (
                <li
                  key={line.customerId}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-stone-800">
                      {line.customerName}
                    </div>
                    <div className="text-xs text-stone-400">
                      {line.jobs} {line.jobs === 1 ? "job" : "jobs"} ·{" "}
                      {formatMoney(line.labourTakings, currency)} labour
                    </div>
                  </div>
                  <span className="ledger shrink-0 text-sm font-bold text-stone-900">
                    {formatMoney(line.shareOwed, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500">
              No done jobs for these customers in this period.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <Link
              href={`/revenue-share/${p.id}`}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Manage deal
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
