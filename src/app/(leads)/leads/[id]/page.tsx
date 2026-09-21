import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead, setLeadStatus, updateLead } from "@/app/actions/leads";
import { LeadForm } from "@/components/LeadForm";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { Collapsible } from "@/components/Collapsible";
import { prisma } from "@/lib/db";
import { formatDayLabel, toDateInput } from "@/lib/dates";
import {
  LEAD_STATUSES,
  leadStatusLabels,
  leadStatusStyles,
} from "@/lib/leads";
import { formatMoney } from "@/lib/money";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <Link href="/leads" className="text-xs font-bold text-brand-700 hover:underline">
          ← Pipeline
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">{lead.workType || "Lead"}</div>
            <h1 className="break-words font-display text-3xl font-extrabold tracking-tight text-brand-900">
              {lead.customerName}
            </h1>
            <p className="mt-1 break-words text-sm text-stone-500">
              {[lead.area, lead.description].filter(Boolean).join(" · ") ||
                "No details added yet"}
            </p>
          </div>
          <span className={`badge shrink-0 ${leadStatusStyles[lead.status]}`}>
            {leadStatusLabels[lead.status]}
          </span>
        </div>
      </div>

      {(lead.phone || lead.email) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {lead.phone ? (
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="btn-primary py-3.5"
            >
              <PhoneIcon className="h-5 w-5" />
              Call
            </a>
          ) : <div />}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="btn-secondary py-3.5">
              <MailIcon className="h-5 w-5" />
              Email
            </a>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="eyebrow">Move to stage</div>
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {LEAD_STATUSES.map((status) => (
            <form action={setLeadStatus} key={status} className="shrink-0">
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                disabled={lead.status === status}
                className={`rounded-full border px-3 py-2 text-xs font-bold ${
                  lead.status === status
                    ? `${leadStatusStyles[status]} border-transparent`
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                {leadStatusLabels[status]}
              </button>
            </form>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCell
          label="Quote value"
          value={lead.quoteValue == null ? "—" : formatMoney(lead.quoteValue)}
          money
        />
        <SummaryCell
          label="Follow up"
          value={lead.followUpDate ? formatDayLabel(lead.followUpDate) : "Not set"}
        />
        <SummaryCell label="Salesman" value={lead.salesman || "Not set"} />
        <SummaryCell
          label="Lead source"
          value={[lead.source, lead.sourceDetail].filter(Boolean).join(" · ") || "Not set"}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-bold text-brand-900">Quote details</h2>
        <dl className="mt-3 divide-y divide-stone-100 text-sm">
          <DetailRow label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
          <DetailRow label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
          <DetailRow label="Referred by" value={lead.referredBy} />
          <DetailRow
            label="Site visit"
            value={lead.siteVisitDate ? formatDayLabel(lead.siteVisitDate) : ""}
          />
          <DetailRow
            label="Quote sent"
            value={lead.quoteDate ? formatDayLabel(lead.quoteDate) : ""}
          />
          {lead.status === "LOST" && (
            <DetailRow label="Lost reason" value={lead.lostReason} />
          )}
          {lead.status === "WON" && (
            <>
              <DetailRow
                label="Final job value"
                value={lead.finalJobValue == null ? "" : formatMoney(lead.finalJobValue)}
              />
              <DetailRow label="Job type" value={lead.jobType} />
              <DetailRow
                label="Job date"
                value={lead.jobDate ? formatDayLabel(lead.jobDate) : ""}
              />
            </>
          )}
          <DetailRow label="Notes" value={lead.notes} multiline />
        </dl>
      </section>

      <div className="mt-4">
        <Collapsible label="Edit all details">
          <LeadForm
            action={updateLead}
            submitLabel="Save changes"
            defaults={{
              id: lead.id,
              customerName: lead.customerName,
              email: lead.email,
              phone: lead.phone,
              area: lead.area,
              salesman: lead.salesman,
              source: lead.source,
              sourceDetail: lead.sourceDetail,
              referredBy: lead.referredBy,
              workType: lead.workType,
              description: lead.description,
              status: lead.status,
              siteVisitDate: lead.siteVisitDate ? toDateInput(lead.siteVisitDate) : undefined,
              quoteDate: lead.quoteDate ? toDateInput(lead.quoteDate) : undefined,
              quoteValue: lead.quoteValue,
              lostReason: lead.lostReason,
              outcomeDate: lead.outcomeDate ? toDateInput(lead.outcomeDate) : undefined,
              finalJobValue: lead.finalJobValue,
              jobType: lead.jobType,
              jobDate: lead.jobDate ? toDateInput(lead.jobDate) : undefined,
              followUpDate: lead.followUpDate ? toDateInput(lead.followUpDate) : undefined,
              notes: lead.notes,
            }}
          />
        </Collapsible>
      </div>

      <form action={deleteLead} className="mt-4">
        <input type="hidden" name="id" value={lead.id} />
        <button type="submit" className="btn-danger w-full">Delete lead</button>
      </form>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  money = false,
}: {
  label: string;
  value: string;
  money?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </div>
      <div className={`mt-1 break-words font-bold text-brand-900 ${money ? "ledger text-lg" : "text-sm"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
  multiline = false,
}: {
  label: string;
  value: string;
  href?: string;
  multiline?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3 ${multiline ? "items-start" : "items-baseline"}`}>
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className={`min-w-0 text-stone-800 ${multiline ? "whitespace-pre-wrap" : "break-words"}`}>
        {value ? (
          href ? <a href={href} className="font-semibold text-brand-700 hover:underline">{value}</a> : value
        ) : (
          <span className="text-stone-300">—</span>
        )}
      </dd>
    </div>
  );
}
