import { formatMoney } from "@/lib/money";
import { formatDayLabel } from "@/lib/dates";
import type { RevenueShareWeekRow } from "@/lib/finance";
import { setRevenueShareWeekAmount } from "@/app/actions/revenueShares";
import { RevenueShareSaveButton } from "@/components/RevenueShareSaveButton";

/** One week with an editable, manually agreed cost. */
export function RevenueShareWeekRowItem({
  shareId,
  row,
  currency,
}: {
  shareId: number;
  row: RevenueShareWeekRow;
  currency?: string;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800">{row.label}</div>
        <div className="text-xs text-stone-400">
          {row.jobs} {row.jobs === 1 ? "job" : "jobs"} ·{" "}
          {formatMoney(row.labourTakings, currency)} labour
        </div>
        {row.savedAt && (
          <div className="text-[11px] text-stone-400">
            Last saved {formatDayLabel(row.savedAt)}
          </div>
        )}
      </div>
      <form
        action={setRevenueShareWeekAmount}
        className="flex w-full shrink-0 items-end gap-2 sm:w-auto"
      >
        <input type="hidden" name="id" value={shareId} />
        <input type="hidden" name="weekStart" value={row.weekKey} />
        <label className="min-w-0 flex-1 sm:w-28 sm:flex-none">
          <span className="label">Cost £</span>
          <input
            key={`${row.weekKey}-${row.manualAmount ?? "empty"}-${row.savedAt?.getTime() ?? 0}`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={
              row.manualAmount == null ? "" : row.manualAmount.toFixed(2)
            }
            placeholder="0.00"
            className="input min-h-11 !py-1.5 text-sm"
          />
        </label>
        <RevenueShareSaveButton />
      </form>
    </li>
  );
}

export function RevenueShareWeekList({
  shareId,
  rows,
  currency,
  totalRecorded,
  weeksRecorded,
  showTotals = true,
  emptyLabel = "No earlier weeks yet — this is week one.",
}: {
  shareId: number;
  rows: RevenueShareWeekRow[];
  currency?: string;
  totalRecorded: number;
  weeksRecorded: number;
  showTotals?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">Previous weeks</span>
        {showTotals && weeksRecorded > 0 && (
          <span className="text-xs text-stone-500">
            <span className="ledger font-bold text-stone-700">
              {formatMoney(totalRecorded, currency)}
            </span>{" "}
            recorded across {weeksRecorded}{" "}
            {weeksRecorded === 1 ? "week" : "weeks"}
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
