import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { createRevenueShare } from "@/app/actions/revenueShares";

export const dynamic = "force-dynamic";

export default async function RevenueShareListPage() {
  const shares = await prisma.revenueShare.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { customers: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Revenue share"
        subtitle="Pay someone a percentage of labour takings from a tagged set of customers — e.g. a seller earn-out on an acquired book."
      />

      <div className="mb-4">
        <Collapsible label="New revenue share">
          <form action={createRevenueShare} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Howard"
                className="input"
              />
            </div>
            <div>
              <label className="label">Share (%)</label>
              <input
                name="percent"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                required
                defaultValue={12.5}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes (optional)</label>
              <input
                name="notes"
                placeholder="e.g. 4-year earn-out on acquired rounds"
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">
                Create
              </button>
            </div>
          </form>
        </Collapsible>
      </div>

      {shares.length === 0 ? (
        <EmptyState
          title="No revenue shares yet"
          hint="Create one, then tick which customers belong to that book."
        />
      ) : (
        <ul className="space-y-2">
          {shares.map((s) => (
            <li key={s.id}>
              <Link
                href={`/revenue-share/${s.id}`}
                className={`card flex items-center justify-between gap-3 p-4 hover:bg-stone-50 ${
                  s.active ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 text-xs font-medium text-stone-400">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-400">
                    {s.percent}% · {s._count.customers}{" "}
                    {s._count.customers === 1 ? "customer" : "customers"}
                  </div>
                </div>
                <span className="text-xs font-semibold text-brand-700">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
