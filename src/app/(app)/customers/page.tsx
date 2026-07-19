import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { CustomerForm } from "@/components/CustomerForm";
import {
  createCustomer,
  syncCustomersFromCalendar,
} from "@/app/actions/customers";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const recurrenceLabel: Record<string, string> = {
  NONE: "One-off",
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Every 2 weeks",
  MONTHLY: "Monthly",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string; created?: string; linked?: string }>;
}) {
  const sp = await searchParams;
  const [customers, crews, settings, revenueShares, orphanCount] =
    await Promise.all([
      prisma.customer.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: {
          defaultCrew: { select: { name: true } },
          revenueShare: { select: { id: true, name: true } },
        },
      }),
      prisma.crew.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      getSettings(),
      prisma.revenueShare.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, percent: true },
      }),
      prisma.scheduledJob.count({ where: { customerId: null } }),
    ]);
  // A round earning less per hour than you'd pay an employee is a red flag.
  const rateFloor = settings.employeeRate;

  // Customers we haven't visited in 90+ days — worth a "shall we book you in?" text.
  const lastVisits = await prisma.scheduledJob.groupBy({
    by: ["customerId"],
    where: { status: "DONE", customerId: { not: null } },
    _max: { date: true },
  });
  const cutoff = new Date(Date.now() - 90 * 86_400_000);
  const lapsed = customers
    .filter((c) => c.active)
    .map((c) => ({
      c,
      last: lastVisits.find((v) => v.customerId === c.id)?._max.date ?? null,
    }))
    .filter((x) => x.last != null && x.last < cutoff)
    .sort((a, b) => a.last!.getTime() - b.last!.getTime());

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Set a repeat schedule and they auto-fill onto the calendar. Add a typical time on site to see each round's £/hr — red means it earns less than you'd pay an employee."
      />

      {sp.synced === "1" && (
        <div className="mb-4 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-800">
          Synced from calendar — added {sp.created ?? "0"} customers and linked{" "}
          {sp.linked ?? "0"} jobs.
        </div>
      )}

      {orphanCount > 0 && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-800">
              {orphanCount} calendar jobs aren’t linked to a customer
            </div>
            <p className="text-xs text-stone-500">
              Old Google Calendar imports only saved the name on the job. Sync
              pulls those names into this list so you can tag them for revenue
              share.
            </p>
          </div>
          <form action={syncCustomersFromCalendar}>
            <button type="submit" className="btn-primary shrink-0">
              Sync from calendar
            </button>
          </form>
        </div>
      )}

      <div className="mb-4">
        <Collapsible label="Add a customer">
          <CustomerForm
            action={createCustomer}
            crews={crews}
            revenueShares={revenueShares}
          />
        </Collapsible>
      </div>

      {lapsed.length > 0 && (
        <div className="card mb-4 p-5">
          <h2 className="font-display text-base font-bold text-brand-900">
            Worth a call
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Not visited in 90+ days — a quick text often books them back in.
          </p>
          <ul className="mt-3 divide-y divide-stone-100">
            {lapsed.slice(0, 8).map(({ c, last }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/customers/${c.id}`}
                    className="truncate text-sm font-semibold text-stone-800 hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="truncate text-xs text-stone-400">
                    {c.contact || c.address || "no contact saved"}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-stone-400">
                  {Math.floor((Date.now() - last!.getTime()) / 86_400_000)} days ago
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          hint="Add your regulars and one-offs here."
        />
      ) : (
        <div className="card divide-y divide-stone-100">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-stone-50 ${
                c.active ? "" : "opacity-50"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-stone-800">{c.name}</div>
                <div className="truncate text-xs text-stone-500">
                  {c.address || c.contact || "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.revenueShare && (
                  <span className="badge bg-stone-100 text-stone-600">
                    {c.revenueShare.name}
                  </span>
                )}
                {c.recurrence !== "NONE" && (
                  <span className="badge bg-brand-100 text-brand-700">
                    {recurrenceLabel[c.recurrence]}
                  </span>
                )}
                {c.defaultPrice != null && c.typicalMinutes ? (
                  (() => {
                    const rate = (c.defaultPrice / c.typicalMinutes) * 60;
                    const tone =
                      rate < rateFloor
                        ? "bg-clay-100 text-clay-600"
                        : rate >= rateFloor * 1.5
                          ? "bg-lime-100 text-lime-600"
                          : "bg-stone-100 text-stone-600";
                    return (
                      <span className={`badge ${tone} tabular-nums`}>
                        £{rate.toFixed(0)}/hr
                      </span>
                    );
                  })()
                ) : null}
                {c.defaultPrice != null && (
                  <span className="text-sm font-semibold text-stone-700 tabular-nums">
                    {formatMoney(c.defaultPrice)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
