import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { RevenueShareDealWeeks } from "@/lib/finance";
import {
  RevenueShareWeekList,
  RevenueShareWeekRowItem,
} from "@/components/RevenueShareWeeks";

export function RevenueShareCard({
  deals,
  currency,
  historyLimit = 6,
}: {
  deals: RevenueShareDealWeeks[];
  currency: string;
  historyLimit?: number;
}) {
  if (deals.length === 0) {
    return (
      <div className="mt-4 card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-brand-900">
              Revenue share
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Enter the agreed amount for each week. Saved amounts feed directly
              into Money as business costs.
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
      {deals.map((deal) => {
        const week = deal.current;

        return (
          <div key={deal.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                  Revenue share · week of {week.label}
                </div>
                <h2 className="font-display text-base font-bold text-brand-900">
                  {deal.name}
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Manual weekly cost · {deal.customerCount}{" "}
                  {deal.customerCount === 1 ? "customer" : "customers"} ·{" "}
                  {week.jobs} {week.jobs === 1 ? "job" : "jobs"} done
                </p>
              </div>
              <div className="shrink-0 text-right">
                {week.manualAmount == null ? (
                  <div className="text-sm font-bold text-clay-600">Not entered</div>
                ) : (
                  <div className="ledger sum text-2xl font-extrabold text-clay-600">
                    {formatMoney(week.manualAmount, currency)}
                  </div>
                )}
                <div className="text-xs text-stone-400">
                  this week&rsquo;s Money cost
                </div>
              </div>
            </div>

            {week.lines.length > 0 ? (
              <ul className="mt-3 divide-y divide-stone-100">
                {week.lines.slice(0, 8).map((line) => (
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
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                Nothing done for these customers yet this week.
              </p>
            )}

            <p className="mt-3 text-xs text-stone-500">
              {deal.percent}% would be {formatMoney(week.shareOwed, currency)}
              {" "}from the tagged jobs, for reference only. Money uses the amount
              you save below.
            </p>
            <ul className="mt-2 rounded-xl bg-stone-50 px-3.5">
              <RevenueShareWeekRowItem
                shareId={deal.id}
                row={week}
                currency={currency}
              />
            </ul>

            <div className="mt-4 border-t border-stone-100 pt-3">
              <RevenueShareWeekList
                shareId={deal.id}
                rows={deal.history.slice(0, historyLimit)}
                currency={currency}
                totalRecorded={deal.totalRecorded}
                weeksRecorded={deal.weeksRecorded}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <Link
                href={`/revenue-share/${deal.id}`}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Manage deal
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
