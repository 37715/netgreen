import { formatMoney } from "@/lib/money";
import type { YearMonthRow } from "@/lib/finance";

export function YearMonthGrid({
  months,
  currency,
}: {
  months: YearMonthRow[];
  currency: string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold text-brand-900">
          By month
        </h2>
        <p className="text-xs text-stone-400">Revenue and profit</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((m) => (
          <MonthTile key={m.key} month={m} currency={currency} />
        ))}
      </div>
    </div>
  );
}

function MonthTile({
  month,
  currency,
}: {
  month: YearMonthRow;
  currency: string;
}) {
  const quiet = month.isFuture && month.revenue === 0 && month.profit === 0;
  const profitTone =
    quiet || month.profit === 0
      ? "text-stone-400"
      : month.profit > 0
        ? "text-brand-700"
        : "text-clay-600";

  return (
    <div
      className={`card flex flex-col p-4 ${
        month.isCurrent
          ? "ring-2 ring-brand-700 ring-offset-2 ring-offset-[var(--background)]"
          : quiet
            ? "opacity-55"
            : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
            month.isCurrent ? "text-brand-700" : "text-stone-400"
          }`}
        >
          {month.label}
        </span>
        {month.isCurrent && (
          <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Now
          </span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
            Revenue
          </dt>
          <dd
            className={`ledger mt-0.5 text-sm font-extrabold ${
              quiet ? "text-stone-400" : "text-stone-800"
            }`}
          >
            {formatMoney(month.revenue, currency)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
            Profit
          </dt>
          <dd className={`ledger mt-0.5 text-sm font-extrabold ${profitTone}`}>
            {formatMoney(month.profit, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
