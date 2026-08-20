"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { YearMonthRow } from "@/lib/finance";
import { ChevronDownIcon } from "@/components/icons";

export function YearMonthGrid({
  months,
  currency,
}: {
  months: YearMonthRow[];
  currency: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold text-brand-900">
          By month
        </h2>
        <p className="text-xs text-stone-400">Tap a month for its biggest costs</p>
      </div>
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((m) => (
          <MonthTile
            key={m.key}
            month={m}
            currency={currency}
            open={openKey === m.key}
            onToggle={() =>
              setOpenKey((current) => (current === m.key ? null : m.key))
            }
          />
        ))}
      </div>
    </div>
  );
}

function MonthTile({
  month,
  currency,
  open,
  onToggle,
}: {
  month: YearMonthRow;
  currency: string;
  open: boolean;
  onToggle: () => void;
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
      className={`card overflow-hidden ${
        month.isCurrent
          ? "ring-2 ring-brand-700 ring-offset-2 ring-offset-[var(--background)]"
          : quiet
            ? "opacity-55"
            : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-col p-4 text-left hover:bg-stone-50/80"
      >
        <span className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
              month.isCurrent ? "text-brand-700" : "text-stone-400"
            }`}
          >
            {month.label}
          </span>
          <span className="flex items-center gap-1.5">
            {month.isCurrent && (
              <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Now
              </span>
            )}
            <ChevronDownIcon
              className={`h-4 w-4 text-stone-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </span>
        </span>
        <dl className="mt-3 grid w-full grid-cols-2 gap-2">
          <span>
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
          </span>
          <span className="text-right">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
              Profit
            </dt>
            <dd className={`ledger mt-0.5 text-sm font-extrabold ${profitTone}`}>
              {formatMoney(month.profit, currency)}
            </dd>
          </span>
        </dl>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
            Biggest costs
          </div>
          {month.costs.length === 0 ? (
            <p className="mt-2 text-xs text-stone-400">Nothing logged this month.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
              {month.costs.map((c, i) => (
                <li
                  key={`${c.label}-${i}`}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="min-w-0 truncate text-xs font-medium text-stone-600">
                    {c.label}
                  </span>
                  <span className="ledger shrink-0 text-xs font-bold text-stone-800">
                    {formatMoney(c.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
