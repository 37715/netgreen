import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDayLabel, calendarDayKey } from "@/lib/dates";
import { PrintButton } from "@/components/PrintButton";
import { markCustomerJobsPaid } from "@/app/actions/jobs";

export const dynamic = "force-dynamic";

/**
 * Print-friendly invoice: every completed-but-unpaid visit for a customer.
 * Use the browser's print dialog to save as PDF or send to a printer.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer, settings] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    getSettings(),
  ]);
  if (!customer) notFound();

  const jobs = await prisma.scheduledJob.findMany({
    where: { customerId, status: "DONE", paidAt: null, price: { gt: 0 } },
    orderBy: { date: "asc" },
  });
  const total = jobs.reduce((s, j) => s + j.price, 0);
  const today = formatDayLabel(new Date());
  const ref = `NG-${customerId}-${calendarDayKey(new Date()).replaceAll("-", "")}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/customers/${customerId}`} className="btn-secondary">
          Back
        </Link>
        <div className="flex gap-2">
          {jobs.length > 0 && (
            <form action={markCustomerJobsPaid}>
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="method" value="BANK" />
              <button type="submit" className="btn-secondary">
                Mark all paid
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="card p-6 sm:p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-2xl font-extrabold text-brand-900">
              {settings.businessName}
            </div>
            <div className="mt-0.5 text-xs text-stone-500">
              Garden maintenance &amp; landscaping
            </div>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div className="font-display text-base font-bold text-stone-800">Invoice</div>
            <div className="mt-1">{today}</div>
            <div>Ref {ref}</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-stone-50 p-4 print:bg-transparent print:border print:border-stone-200">
          <div className="eyebrow">Billed to</div>
          <div className="mt-1 font-semibold text-stone-800">{customer.name}</div>
          {customer.address && (
            <div className="text-sm text-stone-500">{customer.address}</div>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="mt-6 text-sm text-stone-500">
            Nothing outstanding — every completed visit has been paid.
          </p>
        ) : (
          <>
            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Work</th>
                  <th className="pb-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-stone-100">
                    <td className="py-2.5 whitespace-nowrap text-stone-500">
                      {formatDayLabel(j.date)}
                    </td>
                    <td className="py-2.5 text-stone-800">
                      {j.title}
                      {j.wasteBags && j.wasteBagPrice ? (
                        <span className="text-xs text-stone-400">
                          {" "}
                          · incl. waste removal ({j.wasteBags} bags)
                        </span>
                      ) : null}
                    </td>
                    <td className="ledger py-2.5 text-right font-semibold text-stone-800">
                      {formatMoney(j.price, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-end gap-6">
              <span className="font-display font-bold text-stone-800">Total due</span>
              <span className="ledger text-2xl font-extrabold text-brand-800">
                {formatMoney(total, settings.currency)}
              </span>
            </div>
          </>
        )}

        <p className="mt-8 border-t border-stone-100 pt-4 text-xs text-stone-400">
          Thank you — {settings.businessName}. Payment by bank transfer or cash.
        </p>
      </div>
    </div>
  );
}
