import { formatMoney } from "@/lib/money";
import { formatDayLabel } from "@/lib/dates";
import type { RevenueShareWeekRow } from "@/lib/finance";
import {
  markRevenueShareWeekSent,
  unmarkRevenueShareWeekSent,
} from "@/app/actions/revenueShares";

/** One past week: what it came to, and whether it's been sent. */
export function RevenueShareWeekRowItem({
  shareId,
  row,
  currency,
}: {
  shareId: number;
  row: RevenueShareWeekRow;
  currency?: string;
}) {
  const sent = row.sentAmount != null;
  const amount = sent ? row.sentAmount! : row.shareOwed;

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800">{row.label}</div>
        <div className="text-xs text-stone-400">
          {row.jobs} {row.jobs === 1 ? "job" : "jobs"} ·{" "}
          {formatMoney(row.labourTakings, currency)} labour
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`ledger text-sm font-bold ${
            sent ? "text-stone-500" : "text-clay-600"
          }`}
        >
          {formatMoney(amount, currency)}
        </span>
        {sent ? (
          <>
            <span className="badge bg-lime-100 text-lime-600">
              Sent{row.sentAt ? ` ${formatDayLabel(row.sentAt)}` : ""}
            </span>
            <form action={unmarkRevenueShareWeekSent}>
              <input type="hidden" name="id" value={shareId} />
              <input type="hidden" name="weekStart" value={row.weekKey} />
              <button type="submit" className="btn-ghost !px-2 !py-1 !text-xs">
                Undo
              </button>
            </form>
          </>
        ) : (
          <form action={markRevenueShareWeekSent}>
            <input type="hidden" name="id" value={shareId} />
            <input type="hidden" name="weekStart" value={row.weekKey} />
            <button
              type="submit"
              className="btn-secondary !px-2.5 !py-1 !text-xs"
            >
              Mark sent
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export function RevenueShareWeekList({
  shareId,
  rows,
  currency,
  totalSent,
  weeksSent,
  showTotals = true,
  emptyLabel = "No earlier weeks yet — this is week one.",
}: {
  shareId: number;
  rows: RevenueShareWeekRow[];
  currency?: string;
  totalSent: number;
  weeksSent: number;
  showTotals?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">Previous weeks</span>
        {showTotals && weeksSent > 0 && (
          <span className="text-xs text-stone-500">
            <span className="ledger font-bold text-stone-700">
              {formatMoney(totalSent, currency)}
            </span>{" "}
            sent across {weeksSent} {weeksSent === 1 ? "week" : "weeks"}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-1 divide-y divide-stone-100">
          {rows.map((row) => (
            <RevenueShareWeekRowItem
              key={row.weekKey}
              shareId={shareId}
              row={row}
              currency={currency}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
