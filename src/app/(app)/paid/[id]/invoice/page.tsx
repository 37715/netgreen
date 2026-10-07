import { notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import {
  hourlyInvoiceAmount,
  invoiceLineDetail,
  invoiceNumber,
  invoiceTotals,
} from "@/lib/invoice";
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
  const workers = job.workers && job.workers > 0 ? job.workers : 1;
  const hours = job.hours && job.hours > 0 ? job.hours : 1;
  const hourlyRate =
    job.hourlyRate && job.hourlyRate > 0
      ? job.hourlyRate
      : totals.total / (workers * hours);
  const hourlyExtras = Number(
    (totals.total - hourlyInvoiceAmount(workers, hours, hourlyRate)).toFixed(2)
  );

  return (
    <InvoiceEditor
      initial={{
        backHref: `/paid?date=${toDateInput(job.date)}`,
        currency: settings.currency,
        businessName: settings.invoiceBusinessName || settings.businessName,
        phone: settings.invoicePhone,
        email: settings.invoiceEmail,
        address: settings.invoiceAddress,
        website: settings.invoiceWebsite,
        customerName,
        customerAddress: job.customer?.address || "",
        customerContact: job.customer?.contact || "",
        number: invoiceNumber(job.id),
        date: invoiceDateFormatter.format(invoiceDate),
        dueDate: "On receipt",
        description: job.title,
        detail,
        pricingType: job.pricingType,
        quantity: 1,
        unitPrice: totals.total,
        workers,
        hours,
        hourlyRate,
        hourlyExtras,
        paid: totals.paid,
        bankName: settings.invoiceBankName,
        accountNumber: settings.invoiceAccountNumber,
        sortCode: settings.invoiceSortCode,
        signers: settings.invoiceSigners,
      }}
    />
  );
}
