import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import {
  updateRevenueShare,
  setRevenueShareActive,
  deleteRevenueShare,
  setRevenueShareCustomers,
} from "@/app/actions/revenueShares";

export const dynamic = "force-dynamic";

export default async function RevenueShareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const share = await prisma.revenueShare.findUnique({
    where: { id },
    include: {
      customers: { select: { id: true }, orderBy: { name: "asc" } },
    },
  });
  if (!share) notFound();

  const customers = await prisma.customer.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      revenueShareId: true,
      revenueShare: { select: { id: true, name: true } },
    },
  });

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
          toward the weekly figure on Money. New customers stay unticked.
        </p>

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
