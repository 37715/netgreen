import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDayLabel } from "@/lib/dates";
import {
  calculateLeadQuote,
  calculateLeadStats,
  isFollowUpDue,
  LEAD_STATUSES,
  leadStatusLabels,
  leadStatusStyles,
  type LeadStatusValue,
} from "@/lib/leads";
import { formatMoney } from "@/lib/money";
import { LeadsIcon, PlusIcon } from "@/components/icons";
import { LeadStatusTabs } from "@/components/LeadStatusTabs";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const allLeads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const stats = calculateLeadStats(allLeads);
  const statusFilter = LEAD_STATUSES.includes(sp.status as LeadStatusValue)
    ? (sp.status as LeadStatusValue)
    : null;
  const query = (sp.q ?? "").trim().toLowerCase();

  const leads = allLeads
    .filter((lead) => !statusFilter || lead.status === statusFilter)
    .filter((lead) => {
      if (!query) return true;
      return [
        lead.customerName,
        lead.area,
        lead.phone,
        lead.email,
        lead.workType,
        lead.description,
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const aDue = isFollowUpDue(a);
      const bDue = isFollowUpDue(b);
      if (aDue !== bDue) return aDue ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  const counts = Object.fromEntries(
    LEAD_STATUSES.map((status) => [
      status,
      allLeads.filter((lead) => lead.status === status).length,
    ])
  ) as Record<LeadStatusValue, number>;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Quote book</div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-900">
            Pipeline
          </h1>
          <p className="mt-1 max-w-xl text-sm text-stone-500">
            Keep every gardening enquiry moving until it is won or lost.
          </p>
        </div>
        <Link href="/leads/new" className="btn-primary shrink-0">
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New lead</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <PipelineStat label="Open leads" value={String(stats.open)} />
        <PipelineStat
          label="One-off quoted"
          value={formatMoney(stats.oneOffQuotedValue)}
          money
        />
        <PipelineStat
          label="Repeat / month"
          value={formatMoney(stats.recurringMonthlyValue)}
          money
        />
        <PipelineStat
          label="Follow-ups due"
          value={String(stats.dueFollowUps)}
          attention={stats.dueFollowUps > 0}
        />
        <PipelineStat
          label="Win rate"
          value={stats.winRate === null ? "—" : `${stats.winRate}%`}
        />
      </div>

      <LeadStatusTabs
        active={statusFilter}
        total={allLeads.length}
        counts={counts}
      />

      <form className="mt-4 flex gap-2" action="/leads">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input
          name="q"
          type="search"
          defaultValue={sp.q}
          className="input"
          placeholder="Search customer, area or work..."
          aria-label="Search leads"
        />
        <button className="btn-secondary">Search</button>
      </form>

      {leads.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <LeadsIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-lg font-bold text-brand-900">
            {allLeads.length === 0 ? "No leads yet" : "No matching leads"}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {allLeads.length === 0
              ? "Add the next quote enquiry here so it cannot slip through."
              : "Try another status or search."}
          </p>
          {allLeads.length === 0 && (
            <Link href="/leads/new" className="btn-primary mt-4">
              Add first lead
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] gap-4 border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 md:grid">
            <span>Customer / work</span>
            <span>Contact</span>
            <span>Follow-up</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-stone-100">
            {leads.map((lead) => {
              const due = isFollowUpDue(lead);
              const quote = calculateLeadQuote(lead);
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-stone-50 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-stone-900">
                        {lead.customerName}
                      </span>
                      {lead.salesman && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                          {lead.salesman}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-stone-500">
                      {[lead.workType, lead.area].filter(Boolean).join(" · ") ||
                        lead.description ||
                        "No work details yet"}
                    </div>
                  </div>
                  <div className="mt-2 min-w-0 text-xs text-stone-500 md:mt-0">
                    <div className="truncate">{lead.phone || lead.email || "No contact saved"}</div>
                    {(quote.oneOffValue != null ||
                      quote.perVisitValue != null ||
                      quote.monthlyValue != null) && (
                      <div className="ledger mt-0.5 font-semibold text-stone-700">
                        {quote.oneOffValue != null &&
                          `${formatMoney(quote.oneOffValue)} one-off`}
                        {quote.perVisitValue != null &&
                          `${formatMoney(quote.perVisitValue)}/visit`}
                        {quote.monthlyValue != null &&
                          `${quote.perVisitValue != null ? " · " : ""}${formatMoney(
                            quote.monthlyValue
                          )}/month`}
                      </div>
                    )}
                  </div>
                  <div
                    className={`mt-3 text-xs font-semibold md:mt-0 ${
                      due ? "text-clay-600" : "text-stone-400"
                    }`}
                  >
                    {lead.followUpDate
                      ? `${due ? "Due " : ""}${formatDayLabel(lead.followUpDate)}`
                      : "No follow-up"}
                  </div>
                  <div className="mt-3 md:mt-0 md:justify-self-end">
                    <span className={`badge ${leadStatusStyles[lead.status]}`}>
                      {leadStatusLabels[lead.status]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineStat({
  label,
  value,
  money = false,
  attention = false,
}: {
  label: string;
  value: string;
  money?: boolean;
  attention?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        attention
          ? "border-clay-100 bg-clay-100/60"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-extrabold ${
          money ? "ledger text-brand-800" : attention ? "text-clay-600" : "text-brand-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

