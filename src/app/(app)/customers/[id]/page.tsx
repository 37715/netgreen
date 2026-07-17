import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";
import {
  updateCustomer,
  setCustomerActive,
  deleteCustomer,
} from "@/app/actions/customers";

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
  });
  if (!customer) notFound();

  const [crews, revenueShares] = await Promise.all([
    prisma.crew.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.revenueShare.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, percent: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle="Edit customer"
        action={
          <div className="flex gap-2">
            <Link href={`/customers/${customer.id}/invoice`} className="btn-primary">
              Invoice
            </Link>
            <Link href="/customers" className="btn-secondary">
              Back
            </Link>
          </div>
        }
      />

      <div className="card p-5">
        <CustomerForm
          action={updateCustomer}
          crews={crews}
          revenueShares={revenueShares}
          submitLabel="Save changes"
          defaults={{
            id: customer.id,
            name: customer.name,
            contact: customer.contact,
            address: customer.address,
            notes: customer.notes,
            recurrence: customer.recurrence,
            recurrenceAnchor: customer.recurrenceAnchor
              ? toDateInput(customer.recurrenceAnchor)
              : undefined,
            defaultPrice: customer.defaultPrice,
            typicalMinutes: customer.typicalMinutes,
            defaultCrewId: customer.defaultCrewId,
            revenueShareId: customer.revenueShareId,
          }}
        />
      </div>

      <div className="card p-5 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-stone-700">
            {customer.active ? "Active customer" : "Archived"}
          </div>
          <p className="text-xs text-stone-500">
            Archiving stops new recurring visits being created.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={setCustomerActive}>
            <input type="hidden" name="id" value={customer.id} />
            <input type="hidden" name="active" value={String(!customer.active)} />
            <button type="submit" className="btn-secondary">
              {customer.active ? "Archive" : "Reactivate"}
            </button>
          </form>
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={customer.id} />
            <button type="submit" className="btn-danger">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
