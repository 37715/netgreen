import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { CustomerForm } from "@/components/CustomerForm";
import { createCustomer } from "@/app/actions/customers";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const recurrenceLabel: Record<string, string> = {
  NONE: "One-off",
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Every 2 weeks",
  MONTHLY: "Monthly",
};

export default async function CustomersPage() {
  const [customers, crews, settings] = await Promise.all([
    prisma.customer.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { defaultCrew: { select: { name: true } } },
    }),
    prisma.crew.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getSettings(),
  ]);
  // A round earning less per hour than you'd pay an employee is a red flag.
  const rateFloor = settings.employeeRate;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Set a repeat schedule and they auto-fill onto the calendar. Add a typical time on site to see each round's £/hr — red means it earns less than you'd pay an employee."
      />

      <div className="mb-4">
        <Collapsible label="Add a customer">
          <CustomerForm action={createCustomer} crews={crews} />
        </Collapsible>
      </div>

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
