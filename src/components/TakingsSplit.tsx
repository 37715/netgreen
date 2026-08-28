import { formatMoney } from "@/lib/money";
import type { PaymentSplit } from "@/lib/finance";

export function TakingsSplit({
  split,
  currency,
  rangeLabel,
}: {
  split: PaymentSplit;
  currency: string;
  rangeLabel: string;
}) {
  const hasProjectPayments =
    split.projectCash > 0 || split.projectBank > 0 || split.projectOther > 0;
  const cashPercent =
    split.collected > 0 ? Math.round((split.cash / split.collected) * 100) : 0;

  return (
    <div className="mt-4 card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-brand-900">
            Cash vs bank
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            How the money actually came in · {rangeLabel}
          </p>
        </div>
        <div className="text-right">
          <div className="ledger sum text-2xl font-extrabold text-stone-900">
            {formatMoney(split.collected, currency)}
          </div>
          <div className="text-xs text-stone-400">collected</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MethodTile
          label="Cash"
          value={formatMoney(split.cash, currency)}
          meta={
            split.jobCashCount > 0
              ? `${split.jobCashCount} ${
                  split.jobCashCount === 1 ? "job" : "jobs"
                }`
              : "no cash jobs"
          }
          share={cashPercent}
        />
        <MethodTile
          label="Bank"
          value={formatMoney(split.bank, currency)}
          meta={
            split.jobBankCount > 0
              ? `${split.jobBankCount} ${
                  split.jobBankCount === 1 ? "job" : "jobs"
                }`
              : "no bank jobs"
          }
          share={split.collected > 0 ? 100 - cashPercent : 0}
        />
      </div>

      {split.collected > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="bg-lime-500"
            style={{ width: `${cashPercent}%` }}
            aria-hidden
          />
          <div
            className="bg-brand-700"
            style={{ width: `${100 - cashPercent}%` }}
            aria-hidden
          />
        </div>
      )}

      {hasProjectPayments && (
        <dl className="mt-4 space-y-2.5 border-t border-stone-100 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-stone-600">Project payments · cash</dt>
            <dd className="ledger text-stone-700">
              {formatMoney(split.projectCash, currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-stone-600">Project payments · bank</dt>
            <dd className="ledger text-stone-700">
              {formatMoney(split.projectBank, currency)}
            </dd>
          </div>
          {split.projectOther > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-stone-600">
                Project payments · method not set
              </dt>
              <dd className="ledger text-clay-600">
                {formatMoney(split.projectOther, currency)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {split.jobPaidUnknown > 0 && (
        <div className="mt-3 rounded-xl bg-stone-50 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-stone-700">
              Paid, method not recorded · {split.jobPaidUnknownCount}{" "}
              {split.jobPaidUnknownCount === 1 ? "job" : "jobs"}
            </span>
            <span className="ledger shrink-0 text-sm font-bold text-stone-600">
              {formatMoney(split.jobPaidUnknown, currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Counted in revenue above, but it can&apos;t be filed as cash or bank.
            Set it on the Paid tab and it moves into the split.
          </p>
        </div>
      )}

      {split.jobDue > 0 && (
        <div className="mt-3 rounded-xl bg-clay-50 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-stone-700">
              Still to collect · {split.jobDueCount}{" "}
              {split.jobDueCount === 1 ? "job" : "jobs"}
            </span>
            <span className="ledger shrink-0 text-sm font-bold text-clay-600">
              {formatMoney(split.jobDue, currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Work that&rsquo;s done but unpaid. It stays out of revenue until the
            money actually arrives.
          </p>
        </div>
      )}
    </div>
  );
}

function MethodTile({
  label,
  value,
  meta,
  share,
}: {
  label: string;
  value: string;
  meta: string;
  share: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className="ledger text-[11px] font-bold text-stone-400">
          {share}%
        </span>
      </div>
      <div className="ledger mt-1 text-xl font-extrabold text-stone-900">
        {value}
      </div>
      <div className="text-xs text-stone-400">{meta}</div>
    </div>
  );
}
