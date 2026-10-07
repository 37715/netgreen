import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import {
  invoiceLineDetail,
  invoiceNumber,
  invoiceTotals,
} from "@/lib/invoice";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const invoiceDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

export default async function PaidJobInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId < 1) notFound();

  const [job, settings] = await Promise.all([
    prisma.scheduledJob.findUnique({
      where: { id: jobId },
      include: { customer: true },
    }),
    getSettings(),
  ]);

  if (!job || job.status !== "DONE") notFound();

  const totals = invoiceTotals(job.price, job.paidAt);
  const detail = invoiceLineDetail(job);
  const invoiceDate = job.completedAt ?? job.date;
  const customerName = job.customer?.name || "Customer";
  const currency = settings.currency;

  return (
    <div className="invoice-page">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <Link
          href={`/paid?date=${toDateInput(job.date)}`}
          className="btn-secondary"
        >
          Back to Paid
        </Link>
        <PrintButton />
      </div>

      <article className="invoice-document mx-auto bg-white text-[#252525] shadow-xl">
        <header className="invoice-header">
          <Image
            src="/ehw-invoice-logo.jpg"
            width={900}
            height={520}
            alt="EHW Landscapes"
            className="invoice-logo"
            preload
            unoptimized
          />
          <address className="invoice-contact">
            {settings.invoicePhone && <div>{settings.invoicePhone}</div>}
            {settings.invoiceEmail && <div>{settings.invoiceEmail}</div>}
            {settings.invoiceAddress && <div>{settings.invoiceAddress}</div>}
            {settings.invoiceWebsite && <div>{settings.invoiceWebsite}</div>}
          </address>
        </header>

        <div className="invoice-title-row">
          <h1>{settings.invoiceBusinessName || settings.businessName}</h1>
          <div>INVOICE</div>
        </div>

        <section className="invoice-parties">
          <div className="invoice-bill-to">
            <div className="invoice-green-label">BILL TO:</div>
            <div>
              <h2>{customerName}</h2>
              {job.customer?.address && (
                <div className="whitespace-pre-line">{job.customer.address}</div>
              )}
              {job.customer?.contact && (
                <div className="whitespace-pre-line">{job.customer.contact}</div>
              )}
            </div>
          </div>
          <dl className="invoice-meta">
            <div>
              <dt>NUMBER:</dt>
              <dd>{invoiceNumber(job.id)}</dd>
            </div>
            <div>
              <dt>DATE:</dt>
              <dd>{invoiceDateFormatter.format(invoiceDate)}</dd>
            </div>
            <div>
              <dt>DUE DATE:</dt>
              <dd>On receipt</dd>
            </div>
          </dl>
        </section>

        <table className="invoice-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{job.title}</strong>
                {detail && <span>{detail}</span>}
              </td>
              <td>1</td>
              <td>{formatMoney(totals.total, currency)}</td>
              <td>{formatMoney(totals.total, currency)}</td>
            </tr>
          </tbody>
        </table>

        <section className="invoice-summary">
          <dl>
            <div>
              <dt>SUBTOTAL:</dt>
              <dd>{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            <div>
              <dt>TOTAL:</dt>
              <dd>{formatMoney(totals.total, currency)}</dd>
            </div>
            <div>
              <dt>PAID:</dt>
              <dd>{formatMoney(totals.paid, currency)}</dd>
            </div>
          </dl>
        </section>

        <section className="invoice-footer">
          <div className="invoice-payment">
            <h2>Payment instructions</h2>
            <p>{settings.invoiceBankName}</p>
            <p>{settings.invoiceAccountNumber}</p>
            <p>{settings.invoiceSortCode}</p>
          </div>
          <div className="invoice-balance-and-signatures">
            <div className="invoice-balance">
              <span>BALANCE DUE</span>
              <strong>{formatMoney(totals.balance, currency)}</strong>
            </div>
            <div className="invoice-signatures">
              <div className="invoice-signature-lines" aria-hidden="true">
                <span />
                <span />
              </div>
              <div>{settings.invoiceSigners}</div>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
