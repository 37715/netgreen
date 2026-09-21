import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteLead,
  recordLostReason,
  setLeadStatus,
  updateLead,
} from "@/app/actions/leads";
import { LeadForm } from "@/components/LeadForm";
import { MailIcon, PhoneIcon } from "@/components/icons";
import { Collapsible } from "@/components/Collapsible";
import { ConfirmDeleteLead } from "@/components/ConfirmDeleteLead";
import { prisma } from "@/lib/db";
import { formatDayLabel, toDateInput } from "@/lib/dates";
import {
  calculateLeadQuote,
  LEAD_STATUSES,
  leadFrequencyLabels,
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
  const quote = calculateLeadQuote(lead);
  const quoteHeadline =
    quote.oneOffValue != null
      ? `${formatMoney(quote.oneOffValue)} one-off`
      : quote.perVisitValue != null
        ? `${formatMoney(quote.perVisitValue)} per visit`
        : quote.monthlyValue != null
          ? `${formatMoney(quote.monthlyValue)} per month`
          : "Not priced yet";
  const quoteHints = [
    lead.pricingModel === "HOURLY" &&
    lead.hourlyRate != null &&
    lead.estimatedHours != null &&
    lead.estimatedWorkers != null
      ? `${lead.estimatedWorkers} × ${formatMoney(lead.hourlyRate)}/hr × ${lead.estimatedHours} hrs`
      : "",
    quote.perVisitValue != null && quote.monthlyValue != null
      ? `≈ ${formatMoney(quote.monthlyValue)} per month`
      : "",
    lead.quoteJobType === "RECURRING"
      ? lead.frequency === "CUSTOM"
        ? lead.frequencyDetail
        : leadFrequencyLabels[lead.frequency]
      : "",
  ].filter(Boolean);

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
              className={`btn-primary py-3.5 ${lead.email ? "" : "col-span-2"}`}
            >
              <PhoneIcon className="h-5 w-5" />
              Call
            </a>
          ) : <div />}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className={`btn-secondary py-3.5 ${lead.phone ? "" : "col-span-2"}`}
            >
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

      {lead.status === "LOST" && !lead.lostReason && (
        <form
          action={recordLostReason}
          className="mt-4 rounded-2xl border border-clay-100 bg-clay-100/60 p-4"
        >
          <input type="hidden" name="id" value={lead.id} />
          <label className="label text-clay-600">Why was this quote lost?</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select name="lostReason" className="input" required defaultValue="">
              <option value="" disabled>Choose a reason</option>
              <option value="Too expensive">Too expensive</option>
              <option value="No response">No response</option>
              <option value="Competitor">Competitor</option>
              <option value="Delayed / cancelled">Delayed / cancelled</option>
              <option value="Not a good fit">Not a good fit</option>
              <option value="Other">Other</option>
            </select>
            <button type="submit" className="btn-primary shrink-0">Save reason</button>
          </div>
        </form>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCell
          label="Quote pricing"
          value={quoteHeadline}
          hint={quoteHints.join(" · ")}
          money
          wide
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
          <DetailRow
            label="Work basis"
            value={
              lead.quoteJobType === "RECURRING"
                ? "Repeat maintenance"
                : "One-off job"
            }
          />
          <DetailRow
            label="Price basis"
            value={
              {
                FIXED_TOTAL: "Fixed total",
                PER_VISIT: "Per visit",
                HOURLY: "Hourly",
                MONTHLY: "Monthly fee",
              }[lead.pricingModel]
            }
          />
          {lead.quoteJobType === "RECURRING" && (
            <DetailRow
              label="Frequency"
              value={
                lead.frequency === "CUSTOM"
                  ? lead.frequencyDetail
                  : leadFrequencyLabels[lead.frequency]
              }
            />
          )}
          {lead.status === "LOST" && (
            <DetailRow label="Lost reason" value={lead.lostReason} />
          )}
          {lead.status === "WON" && (
            <>
              <DetailRow
                label="Final job value"
                value={lead.finalJobValue == null ? "" : formatMoney(lead.finalJobValue)}
              />
              <DetailRow
                label="Job date"
                value={lead.jobDate ? formatDayLabel(lead.jobDate) : ""}
              />
            </>
          )}
          <DetailRow label="Notes" value={lead.notes} multiline />
        </dl>
      </section>

      <div className="mt-4" id="edit-details">
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
              quoteJobType: lead.quoteJobType,
              pricingModel: lead.pricingModel,
              frequency: lead.frequency,
              frequencyDetail: lead.frequencyDetail,
              quoteValue: lead.quoteValue,
              hourlyRate: lead.hourlyRate,
              estimatedHours: lead.estimatedHours,
              estimatedWorkers: lead.estimatedWorkers,
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

      <div className="mt-4">
        <ConfirmDeleteLead id={lead.id} action={deleteLead} />
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  hint,
  money = false,
  wide = false,
}: {
  label: string;
  value: string;
  hint?: string;
  money?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
        wide ? "col-span-2" : ""
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </div>
      <div className={`mt-1 break-words font-bold text-brand-900 ${money ? "ledger text-lg" : "text-sm"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
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
