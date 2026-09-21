"use client";

import { useState } from "react";
import {
  LEAD_STATUSES,
  leadSourceOptions,
  leadStatusLabels,
  leadWorkTypeOptions,
  salesmanOptions,
  type LeadStatusValue,
} from "@/lib/leads";

export type LeadFormDefaults = {
  id?: number;
  customerName?: string;
  email?: string;
  phone?: string;
  area?: string;
  salesman?: string;
  source?: string;
  sourceDetail?: string;
  referredBy?: string;
  workType?: string;
  description?: string;
  status?: LeadStatusValue;
  siteVisitDate?: string;
  quoteDate?: string;
  quoteValue?: number | null;
  lostReason?: string;
  outcomeDate?: string;
  finalJobValue?: number | null;
  jobType?: string;
  jobDate?: string;
  followUpDate?: string;
  notes?: string;
};

export function LeadForm({
  action,
  defaults = {},
  submitLabel = "Save lead",
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: LeadFormDefaults;
  submitLabel?: string;
}) {
  const [status, setStatus] = useState<LeadStatusValue>(defaults.status ?? "NEW");

  return (
    <form action={action} className="space-y-4">
      {defaults.id != null && <input type="hidden" name="id" value={defaults.id} />}

      <FormSection title="Customer" hint="The details you need when it is time to follow up.">
        <Field label="Customer / company" wide>
          <input
            name="customerName"
            defaultValue={defaults.customerName}
            className="input"
            placeholder="e.g. Jamie Smith"
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Phone number">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={defaults.phone}
            className="input"
            placeholder="07..."
            autoComplete="tel"
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            inputMode="email"
            defaultValue={defaults.email}
            className="input"
            placeholder="name@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Area / postcode" wide>
          <input
            name="area"
            defaultValue={defaults.area}
            className="input"
            placeholder="e.g. Havant, PO9"
            autoComplete="postal-code"
          />
        </Field>
      </FormSection>

      <FormSection title="The enquiry" hint="Where it came from and what they want priced.">
        <Field label="Salesman">
          <input
            name="salesman"
            list="salesman-options"
            defaultValue={defaults.salesman}
            className="input"
            placeholder="Choose or type a name"
          />
          <datalist id="salesman-options">
            {salesmanOptions.map((name) => <option key={name} value={name} />)}
          </datalist>
        </Field>
        <Field label="Lead source">
          <input
            name="source"
            list="lead-source-options"
            defaultValue={defaults.source}
            className="input"
            placeholder="Google, referral..."
          />
          <datalist id="lead-source-options">
            {leadSourceOptions.map((source) => <option key={source} value={source} />)}
          </datalist>
        </Field>
        <Field label="Source detail">
          <input
            name="sourceDetail"
            defaultValue={defaults.sourceDetail}
            className="input"
            placeholder="Google Maps, Facebook ad..."
          />
        </Field>
        <Field label="Referred by">
          <input
            name="referredBy"
            defaultValue={defaults.referredBy}
            className="input"
            placeholder="Customer / person"
          />
        </Field>
        <Field label="Work type" wide>
          <input
            name="workType"
            list="work-type-options"
            defaultValue={defaults.workType}
            className="input"
            placeholder="Patio, fencing, maintenance..."
          />
          <datalist id="work-type-options">
            {leadWorkTypeOptions.map((type) => <option key={type} value={type} />)}
          </datalist>
        </Field>
        <Field label="Brief description" wide>
          <textarea
            name="description"
            defaultValue={defaults.description}
            className="input"
            rows={3}
            placeholder='e.g. "20m² porcelain patio and 12m fencing"'
          />
        </Field>
      </FormSection>

      <FormSection title="Progress" hint="The dates and value that move this quote forward.">
        <Field label="Lead status">
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatusValue)}
            className="input"
          >
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>{leadStatusLabels[value]}</option>
            ))}
          </select>
        </Field>
        <Field label="Follow-up date">
          <input
            name="followUpDate"
            type="date"
            defaultValue={defaults.followUpDate}
            className="input"
          />
        </Field>
        <Field label="Site visit date">
          <input
            name="siteVisitDate"
            type="date"
            defaultValue={defaults.siteVisitDate}
            className="input"
          />
        </Field>
        <Field label="Quote sent">
          <input
            name="quoteDate"
            type="date"
            defaultValue={defaults.quoteDate}
            className="input"
          />
        </Field>
        <Field label="Quote value (£)" wide>
          <input
            name="quoteValue"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={defaults.quoteValue ?? ""}
            className="input"
            placeholder="0.00"
          />
        </Field>

        {status === "WON" && (
          <>
            <Field label="Date won">
              <input
                name="outcomeDate"
                type="date"
                defaultValue={defaults.outcomeDate}
                className="input"
              />
            </Field>
            <Field label="Final job value (£)">
              <input
                name="finalJobValue"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={defaults.finalJobValue ?? ""}
                className="input"
                placeholder="0.00"
              />
            </Field>
            <Field label="Job type">
              <select name="jobType" defaultValue={defaults.jobType ?? ""} className="input">
                <option value="">Not set</option>
                <option value="One-off">One-off</option>
                <option value="Recurring">Recurring</option>
              </select>
            </Field>
            <Field label="Job date">
              <input
                name="jobDate"
                type="date"
                defaultValue={defaults.jobDate}
                className="input"
              />
            </Field>
          </>
        )}

        {status === "LOST" && (
          <>
            <Field label="Date lost">
              <input
                name="outcomeDate"
                type="date"
                defaultValue={defaults.outcomeDate}
                className="input"
              />
            </Field>
            <Field label="Lost reason" wide>
              <select
                name="lostReason"
                defaultValue={defaults.lostReason ?? ""}
                className="input"
              >
                <option value="">Choose a reason</option>
                <option value="Too expensive">Too expensive</option>
                <option value="No response">No response</option>
                <option value="Competitor">Competitor</option>
                <option value="Delayed / cancelled">Delayed / cancelled</option>
                <option value="Not a good fit">Not a good fit</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title="Notes">
        <Field label="Anything else" wide>
          <textarea
            name="notes"
            defaultValue={defaults.notes}
            className="input"
            rows={4}
            placeholder="Access, preferences, what matters to them..."
          />
        </Field>
      </FormSection>

      <button type="submit" className="btn-primary w-full py-3.5 text-base">
        {submitLabel}
      </button>
    </form>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-base font-bold text-brand-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
