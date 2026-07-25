import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { getRevenueShareWeeks } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  RevenueShareWeekList,
  RevenueShareWeekRowItem,
} from "@/components/RevenueShareWeeks";
import {
  updateRevenueShare,
  setRevenueShareActive,
  deleteRevenueShare,
  setRevenueShareCustomers,
} from "@/app/actions/revenueShares";
import { syncCustomersFromCalendar } from "@/app/actions/customers";

export const dynamic = "force-dynamic";

export default async function RevenueShareDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; count?: string }>;
}) {
  const { id: idStr } = await params;
  const sp = await searchParams;
  const id = Number(idStr);
  const share = await prisma.revenueShare.findUnique({
    where: { id },
    include: {
      customers: { select: { id: true }, orderBy: { name: "asc" } },
    },
  });
  if (!share) notFound();

  const [settings, weekly, customers, orphanCount] = await Promise.all([
    getSettings(),
    getRevenueShareWeeks({ weeksBack: 26, shareId: id }).then((d) => d[0]),
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        revenueShareId: true,
        revenueShare: { select: { id: true, name: true } },
      },
    }),
    prisma.scheduledJob.count({ where: { customerId: null } }),
  ]);

  const selected = new Set(share.customers.map((c) => c.id));

  return (
    <div>
      <PageHeader
        title={share.name}
        subtitle={`${share.percent}% of labour takings from tagged customers`}
        action={
          <Link href="/revenue-share" className="btn-secondary">
            All shares
          </Link>
        }
      />

      {sp.saved === "1" && (
        <div className="mb-4 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-800">
          Saved — {sp.count ?? "0"} customers on this revenue share.
        </div>
      )}

      {weekly && (
        <div className="card mb-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-brand-900">
                Weekly payouts
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {weekly.percent}% of labour takings, Monday to Sunday. Marking a
                week sent locks that figure.
              </p>
            </div>
            {weekly.weeksSent > 0 && (
              <div className="text-right">
                <div className="ledger sum text-xl font-extrabold text-stone-900">
                  {formatMoney(weekly.totalSent, settings.currency)}
                </div>
                <div className="text-[11px] text-stone-400">
                  sent across {weekly.weeksSent}{" "}
                  {weekly.weeksSent === 1 ? "week" : "weeks"}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <span className="eyebrow">This week</span>
            <ul>
              <RevenueShareWeekRowItem
                shareId={weekly.id}
                row={weekly.current}
                currency={settings.currency}
              />
            </ul>
          </div>

          <div className="mt-3 border-t border-stone-100 pt-3">
            <RevenueShareWeekList
              shareId={weekly.id}
              rows={weekly.history}
              currency={settings.currency}
              totalSent={weekly.totalSent}
              weeksSent={weekly.weeksSent}
              showTotals={false}
            />
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-800">Deal details</h2>
        <form action={updateRevenueShare} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={share.id} />
          <input type="hidden" name="active" value={share.active ? "true" : "false"} />
          <div>
            <label className="label">Name</label>
            <input name="name" defaultValue={share.name} required className="input" />
          </div>
          <div>
            <label className="label">Share (%)</label>
            <input
              name="percent"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              defaultValue={share.percent}
              required
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <input name="notes" defaultValue={share.notes} className="input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save deal
            </button>
          </div>
        </form>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="text-sm font-bold text-stone-800">Customers in this book</h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Tick every customer that belongs to this share. Done jobs for them count
          toward the weekly figure on Money. Currently {selected.size} selected ·{" "}
          {customers.length} on the list.
        </p>

        {orphanCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
            <p className="text-xs text-stone-600">
              {orphanCount} calendar jobs still aren’t on this list (old imports).
              Sync them first, then tick Howard’s rounds.
            </p>
            <form action={syncCustomersFromCalendar}>
              <button type="submit" className="btn-secondary !py-1.5 !text-xs">
                Sync from calendar
              </button>
            </form>
          </div>
        )}

        <form action={setRevenueShareCustomers} className="mt-4">
          <input type="hidden" name="id" value={share.id} />
          {customers.length === 0 ? (
            <p className="text-sm text-stone-500">No active customers yet.</p>
          ) : (
            <ul className="max-h-[28rem] space-y-1 overflow-y-auto rounded-xl border border-stone-100 p-2">
              {customers.map((c) => {
                const onOther =
                  c.revenueShareId != null && c.revenueShareId !== share.id;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-stone-50 ${
                        onOther ? "opacity-60" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="customerId"
                        value={c.id}
                        defaultChecked={selected.has(c.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-stone-800">
                          {c.name}
                        </span>
                        <span className="block text-xs text-stone-400">
                          {c.address || "No address"}
                          {onOther && c.revenueShare
                            ? ` · currently on ${c.revenueShare.name}`
                            : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="submit" className="btn-primary mt-3">
            Save customers
          </button>
        </form>
      </div>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-sm font-semibold text-stone-700">
            {share.active ? "Active" : "Inactive"}
          </div>
          <p className="text-xs text-stone-500">
            Inactive deals are hidden from the Money calculator.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={setRevenueShareActive}>
            <input type="hidden" name="id" value={share.id} />
            <input
              type="hidden"
              name="active"
              value={share.active ? "false" : "true"}
            />
            <button type="submit" className="btn-secondary">
              {share.active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
          <form action={deleteRevenueShare}>
            <input type="hidden" name="id" value={share.id} />
            <button type="submit" className="btn-ghost text-clay-600">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
