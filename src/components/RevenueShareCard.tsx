import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { formatDayLabel } from "@/lib/dates";
import type { RevenueShareDealWeeks } from "@/lib/finance";
import { RevenueShareWeekList } from "@/components/RevenueShareWeeks";
import {
  markRevenueShareWeekSent,
  unmarkRevenueShareWeekSent,
} from "@/app/actions/revenueShares";

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
              Pay someone a % of labour takings from a tagged customer book,
              worked out fresh every week.
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
        const sent = week.sentAmount != null;
        const dueNow = sent ? week.sentAmount! : week.shareOwed;

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
                  {deal.percent}% of labour takings · {deal.customerCount}{" "}
                  {deal.customerCount === 1 ? "customer" : "customers"} ·{" "}
                  {week.jobs} {week.jobs === 1 ? "job" : "jobs"} done
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="ledger sum text-2xl font-extrabold text-clay-600">
                  {formatMoney(dueNow, currency)}
                </div>
                <div className="text-xs text-stone-400">
                  on {formatMoney(week.labourTakings, currency)} labour
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
                    <span className="ledger shrink-0 text-sm font-bold text-stone-900">
                      {formatMoney(line.shareOwed, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                Nothing done for these customers yet this week.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 px-3.5 py-3">
              {sent ? (
                <>
                  <p className="text-xs text-stone-600">
                    This week is settled at{" "}
                    <span className="ledger font-bold text-stone-800">
                      {formatMoney(week.sentAmount!, currency)}
                    </span>
                    {week.sentAt ? ` · sent ${formatDayLabel(week.sentAt)}` : ""}
                  </p>
                  <form action={unmarkRevenueShareWeekSent}>
                    <input type="hidden" name="id" value={deal.id} />
                    <input type="hidden" name="weekStart" value={week.weekKey} />
                    <button
                      type="submit"
                      className="btn-ghost !py-1.5 !text-xs"
                    >
                      Undo
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-xs text-stone-600">
                    Resets every Monday. Mark it sent and the figure is locked,
                    even if you edit those jobs later.
                  </p>
                  <form action={markRevenueShareWeekSent}>
                    <input type="hidden" name="id" value={deal.id} />
                    <input type="hidden" name="weekStart" value={week.weekKey} />
                    <button
                      type="submit"
                      className="btn-secondary !py-1.5 !text-xs"
                      disabled={week.shareOwed <= 0}
                    >
                      Mark this week sent
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="mt-4 border-t border-stone-100 pt-3">
              <RevenueShareWeekList
                shareId={deal.id}
                rows={deal.history.slice(0, historyLimit)}
                currency={currency}
                totalSent={deal.totalSent}
                weeksSent={deal.weeksSent}
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
