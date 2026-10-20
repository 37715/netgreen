import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const jobSelect = {
    id: true,
    date: true,
    title: true,
    price: true,
    paidAt: true,
    customerId: true,
    customer: { select: { name: true } },
  } as const;
  const [jobs, unpaid] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { status: "DONE", price: { gt: 0 } },
      orderBy: { date: "desc" },
      take: 60,
      select: jobSelect,
    }),
    prisma.scheduledJob.findMany({
      where: { status: "DONE", paidAt: null, price: { gt: 0 }, customerId: { not: null } },
      select: jobSelect,
    }),
  ]);

  const outstanding = new Map<number, { name: string; total: number; visits: number }>();
  for (const job of unpaid) {
    if (job.customerId == null) continue;
    const current = outstanding.get(job.customerId) ?? {
      name: job.customer?.name ?? "Customer",
      total: 0,
      visits: 0,
    };
    current.total += job.price;
    current.visits += 1;
    outstanding.set(job.customerId, current);
  }
  const statements = [...outstanding.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Job invoices and customer statements. The same actions stay on each job and round."
      />

      <section className="card p-4">
        <h2 className="font-display text-base font-bold text-brand-900">Outstanding statements</h2>
        {statements.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No unpaid completed visits.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {statements.map(([customerId, statement]) => (
              <li key={customerId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-800">{statement.name}</div>
                  <div className="text-xs text-stone-500">
                    {statement.visits} {statement.visits === 1 ? "visit" : "visits"} · {formatMoney(statement.total)}
                  </div>
                </div>
                <Link href={`/customers/${customerId}/invoice`} className="btn-secondary shrink-0 !py-1.5 !text-sm">
                  Invoice
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-4 p-4">
        <h2 className="font-display text-base font-bold text-brand-900">Completed jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No completed jobs to invoice.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">{job.title}</div>
                  <div className="text-xs text-stone-500">
                    {formatDayLabel(job.date)}
                    {job.customer?.name ? ` · ${job.customer.name}` : ""} · {formatMoney(job.price)}
                    {job.paidAt == null ? " · unpaid" : ""}
                  </div>
                </div>
                <Link href={`/paid/${job.id}/invoice`} className="btn-secondary shrink-0 !py-1.5 !text-sm">
                  Generate invoice
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
