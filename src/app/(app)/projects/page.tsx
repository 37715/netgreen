import Link from "next/link";
import { prisma } from "@/lib/db";
import { projectTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PageHeader, EmptyState, StatusBadge, MarginBadge } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { ProjectForm } from "@/components/ProjectForm";
import { createProject, setProjectStatus } from "@/app/actions/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, customers] = await Promise.all([
    prisma.project.findMany({
      include: { costs: true, payments: true, customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Bigger jobs with materials, costs and margins."
      />

      <div className="mb-4">
        <Collapsible label="New project">
          <ProjectForm action={createProject} customers={customers} />
        </Collapsible>
      </div>

      {(() => {
        const quotes = projects.filter((p) => p.status === "QUOTE");
        if (quotes.length === 0) return null;
        const quotedValue = quotes.reduce((s, p) => s + p.quotedPrice, 0);
        const won = projects.filter(
          (p) => p.status === "ACTIVE" || p.status === "DONE" || p.status === "PAID"
        ).length;
        const lost = projects.filter((p) => p.status === "LOST").length;
        return (
          <div className="card mb-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-brand-900">
                Quotes out
              </h2>
              <span className="text-xs text-stone-400">
                {formatMoney(quotedValue)} quoted
                {won + lost > 0 &&
                  ` · winning ${Math.round((won / (won + lost)) * 100)}% of work`}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-stone-100">
              {quotes.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${p.id}`}
                      className="truncate text-sm font-semibold text-stone-800 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-stone-400">
                      {p.customer?.name ?? "No customer"} ·{" "}
                      <span className="ledger">{formatMoney(p.quotedPrice)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <form action={setProjectStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <button
                        type="submit"
                        className="rounded-lg bg-lime-100 px-2.5 py-1 text-xs font-bold text-lime-600 hover:bg-lime-200"
                      >
                        Won it
                      </button>
                    </form>
                    <form action={setProjectStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="LOST" />
                      <button
                        type="submit"
                        className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-500 hover:bg-stone-200"
                      >
                        Lost
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Add a patio, fencing or turfing job to track its profit and margin."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects
            .filter((p) => p.status !== "QUOTE")
            .map((p) => {
            const t = projectTotals(p);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card p-4 hover:border-brand-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-stone-800">{p.title}</div>
                    <div className="truncate text-xs text-stone-500">
                      {p.customer?.name ?? "No customer"}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-stone-900 tabular-nums">
                      {formatMoney(t.profit)}
                    </div>
                    <div className="text-xs text-stone-400">profit so far</div>
                  </div>
                  <MarginBadge margin={t.margin} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center text-xs">
                  <Mini label="Quoted" value={formatMoney(t.quoted)} />
                  <Mini label="Paid" value={formatMoney(t.paid)} />
                  <Mini label="Costs" value={formatMoney(t.costs)} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold text-stone-700 tabular-nums">{value}</div>
      <div className="text-stone-400">{label}</div>
    </div>
  );
}
