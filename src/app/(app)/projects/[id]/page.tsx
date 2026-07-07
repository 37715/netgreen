import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { projectTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { toDateInput, formatDayLabel } from "@/lib/dates";
import { PageHeader, StatCard, StatusBadge, MarginBadge } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { ProjectForm } from "@/components/ProjectForm";
import { TrashIcon } from "@/components/icons";
import {
  addCost,
  deleteCost,
  addPayment,
  deletePayment,
  updateProject,
  deleteProject,
} from "@/app/actions/projects";

const costCategoryLabel: Record<string, string> = {
  MATERIALS: "Materials",
  WAGES: "Employee wages",
  HIRE: "Hire / plant",
  WASTE: "Waste / skip",
  OTHER: "Other",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id: Number(id) },
    include: {
      costs: { orderBy: { date: "desc" } },
      payments: { orderBy: { date: "desc" } },
      customer: true,
    },
  });
  if (!project) notFound();

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const t = projectTotals(project);
  const today = toDateInput(new Date());

  return (
    <div>
      <PageHeader
        title={project.title}
        subtitle={project.customer?.name ?? "No customer"}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <Link href="/projects" className="btn-secondary">
              Back
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Quoted" value={formatMoney(t.quoted)} />
        <StatCard label="Paid in" value={formatMoney(t.paid)} tone="default" hint={`${formatMoney(t.outstanding)} outstanding`} />
        <StatCard label="Costs out" value={formatMoney(t.costs)} tone="negative" />
        <StatCard
          label="Profit"
          value={formatMoney(t.profit)}
          tone={t.profit >= 0 ? "positive" : "negative"}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <MarginBadge margin={t.margin} />
        <span className="text-xs text-stone-400">
          Margin = (revenue − costs) ÷ revenue. Your & Hugo&apos;s time isn&apos;t counted — that&apos;s your profit.
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* Costs */}
        <div className="card p-4">
          <h2 className="text-sm font-bold text-stone-800 mb-1">Costs &amp; materials</h2>
          <p className="text-xs text-stone-500 mb-3">
            Tip: if the customer pays you back for materials, tick &quot;reimbursable&quot; and also log
            their repayment as a payment — profit stays just your markup.
          </p>
          {project.costs.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">No costs yet</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {project.costs.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-stone-800">
                      {c.description || costCategoryLabel[c.category]}
                    </div>
                    <div className="text-xs text-stone-400">
                      {costCategoryLabel[c.category]} · {formatDayLabel(c.date)}
                      {c.reimbursable && " · reimbursable"}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-stone-800 tabular-nums">
                    {formatMoney(c.amount)}
                  </span>
                  <form action={deleteCost}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button className="text-stone-300 hover:text-red-500" aria-label="Delete cost">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Collapsible label="Add a cost">
              <form action={addCost} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label className="label">Category</label>
                  <select name="category" className="input" defaultValue="MATERIALS">
                    {Object.entries(costCategoryLabel).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (£)</label>
                  <input name="amount" type="number" step="0.01" inputMode="decimal" className="input" placeholder="0.00" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <input name="description" className="input" placeholder="e.g. 25 bags MOT Type 1" />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input name="date" type="date" defaultValue={today} className="input" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="checkbox" name="reimbursable" className="h-4 w-4 rounded border-stone-300" />
                    Customer reimburses this
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <button className="btn-primary">Add cost</button>
                </div>
              </form>
            </Collapsible>
          </div>
        </div>

        {/* Payments */}
        <div className="card p-4">
          <h2 className="text-sm font-bold text-stone-800 mb-3">Payments received</h2>
          {project.payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">No payments yet</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {project.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-stone-800">
                      {p.note || "Payment"}
                    </div>
                    <div className="text-xs text-stone-400">
                      {formatDayLabel(p.date)}
                      {p.method && ` · ${p.method}`}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-700 tabular-nums">
                    {formatMoney(p.amount)}
                  </span>
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button className="text-stone-300 hover:text-red-500" aria-label="Delete payment">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Collapsible label="Record a payment">
              <form action={addPayment} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label className="label">Amount (£)</label>
                  <input name="amount" type="number" step="0.01" inputMode="decimal" className="input" placeholder="0.00" required />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input name="date" type="date" defaultValue={today} className="input" />
                </div>
                <div>
                  <label className="label">Method</label>
                  <input name="method" className="input" placeholder="Bank transfer, cash..." />
                </div>
                <div>
                  <label className="label">Note</label>
                  <input name="note" className="input" placeholder="Deposit, final, materials..." />
                </div>
                <div className="sm:col-span-2">
                  <button className="btn-primary">Add payment</button>
                </div>
              </form>
            </Collapsible>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Collapsible label="Edit project details">
          <ProjectForm
            action={updateProject}
            customers={customers}
            submitLabel="Save changes"
            defaults={{
              id: project.id,
              title: project.title,
              status: project.status,
              quotedPrice: project.quotedPrice,
              startDate: project.startDate ? toDateInput(project.startDate) : undefined,
              customerId: project.customerId,
              notes: project.notes,
            }}
          />
        </Collapsible>

        <form action={deleteProject}>
          <input type="hidden" name="id" value={project.id} />
          <button className="btn-danger">Delete project</button>
        </form>
      </div>
    </div>
  );
}
