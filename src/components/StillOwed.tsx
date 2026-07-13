"use client";

import { useState } from "react";
import Link from "next/link";
import { createDebt, markDebtPaid, deleteDebt } from "@/app/actions/debts";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

export type OwedProject = {
  kind: "project";
  id: number;
  title: string;
  customerName: string | null;
  amount: number;
  status: string;
};

export type OwedDebt = {
  kind: "debt";
  id: number;
  name: string;
  amount: number;
};

export type OwedItem = OwedProject | OwedDebt;

export function StillOwed({
  items,
  total,
  currency,
}: {
  items: OwedItem[];
  total: number;
  currency: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-brand-900">
          Still owed
        </h2>
        <div className="flex items-center gap-2">
          <span className="ledger text-sm font-bold text-clay-600">
            {formatMoney(total, currency)}
          </span>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-brand-700 hover:bg-stone-50"
            title="Add someone who owes you"
            aria-label="Add debt"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createDebt(fd);
            setAdding(false);
          }}
          className="mt-3 space-y-2 rounded-xl border border-stone-100 bg-stone-50 p-3"
        >
          <input
            name="name"
            required
            placeholder="Who owes you?"
            className="input text-sm"
            autoFocus
          />
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            placeholder="Amount"
            className="input text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !py-2 !text-sm">
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-ghost !py-2 !text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          Nobody owes you right now. Nice.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {items.map((item) =>
            item.kind === "project" ? (
              <li
                key={`p-${item.id}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${item.id}`}
                    className="truncate text-sm font-semibold text-stone-800 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <div className="text-xs text-stone-400">
                    {item.customerName ?? "No customer"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="ledger text-sm font-bold text-stone-900">
                    {formatMoney(item.amount, currency)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              </li>
            ) : (
              <li
                key={`d-${item.id}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">
                    {item.name}
                  </div>
                  <div className="text-xs text-stone-400">IOU</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="ledger text-sm font-bold text-stone-900">
                    {formatMoney(item.amount, currency)}
                  </span>
                  <form action={markDebtPaid}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Paid
                    </button>
                  </form>
                  <form action={deleteDebt}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-stone-400 hover:text-clay-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
