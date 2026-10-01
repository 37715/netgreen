"use client";

import { useMemo, useState } from "react";
import {
  calculateLeadQuote,
  followUpDateForPreset,
  leadAreaOptions,
  leadFrequencyLabels,
  LEAD_FREQUENCIES,
  LEAD_STATUSES,
  leadSourceOptions,
  leadStatusLabels,
  leadWorkTypeOptions,
  salesmanOptions,
  type FollowUpPreset,
  type LeadFrequencyValue,
  type LeadPricingModelValue,
  type LeadQuoteJobTypeValue,
  type LeadStatusValue,
} from "@/lib/leads";
import { formatMoney } from "@/lib/money";

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
  quoteJobType?: LeadQuoteJobTypeValue;
  pricingModel?: LeadPricingModelValue;
  frequency?: LeadFrequencyValue;
  frequencyDetail?: string;
  customVisitsPerYear?: number | null;
  quoteValue?: number | null;
  hourlyRate?: number | null;
  estimatedHours?: number | null;
  estimatedWorkers?: number | null;
  recurringPricingModel?: LeadPricingModelValue;
  recurringFrequency?: LeadFrequencyValue;
  recurringFrequencyDetail?: string;
  recurringCustomVisitsPerYear?: number | null;
  recurringQuoteValue?: number | null;
  recurringHourlyRate?: number | null;
  recurringEstimatedHours?: number | null;
  recurringEstimatedWorkers?: number | null;
  verbalQuoteGiven?: boolean;
  verbalQuoteAgreed?: boolean;
  formalEstimateSent?: boolean;
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
  const [quoteJobType, setQuoteJobType] = useState<LeadQuoteJobTypeValue>(
    defaults.quoteJobType ?? "ONE_OFF"
  );
  const [pricingModel, setPricingModel] = useState<LeadPricingModelValue>(
    defaults.pricingModel ?? "FIXED_TOTAL"
  );
  const [frequency, setFrequency] = useState<LeadFrequencyValue>(
    defaults.frequency ?? "ONCE"
  );
  const [quoteValue, setQuoteValue] = useState(
    defaults.quoteValue == null ? "" : String(defaults.quoteValue)
  );
  const [hourlyRate, setHourlyRate] = useState(
    defaults.hourlyRate == null ? "" : String(defaults.hourlyRate)
  );
  const [estimatedHours, setEstimatedHours] = useState(
    defaults.estimatedHours == null ? "" : String(defaults.estimatedHours)
  );
  const [estimatedWorkers, setEstimatedWorkers] = useState(
    defaults.estimatedWorkers == null ? "1" : String(defaults.estimatedWorkers)
  );
  const [customVisitsPerYear, setCustomVisitsPerYear] = useState(
    defaults.customVisitsPerYear == null
      ? ""
      : String(defaults.customVisitsPerYear)
  );
  const [recurringPricingModel, setRecurringPricingModel] =
    useState<LeadPricingModelValue>(
      defaults.recurringPricingModel ?? "PER_VISIT"
    );
  const [recurringFrequency, setRecurringFrequency] =
    useState<LeadFrequencyValue>(defaults.recurringFrequency ?? "WEEKLY");
  const [recurringCustomVisitsPerYear, setRecurringCustomVisitsPerYear] =
    useState(
      defaults.recurringCustomVisitsPerYear == null
        ? ""
        : String(defaults.recurringCustomVisitsPerYear)
    );
  const [recurringQuoteValue, setRecurringQuoteValue] = useState(
    defaults.recurringQuoteValue == null
      ? ""
      : String(defaults.recurringQuoteValue)
  );
  const [recurringHourlyRate, setRecurringHourlyRate] = useState(
    defaults.recurringHourlyRate == null
      ? ""
      : String(defaults.recurringHourlyRate)
  );
  const [recurringEstimatedHours, setRecurringEstimatedHours] = useState(
    defaults.recurringEstimatedHours == null
      ? ""
      : String(defaults.recurringEstimatedHours)
  );
  const [recurringEstimatedWorkers, setRecurringEstimatedWorkers] = useState(
    defaults.recurringEstimatedWorkers == null
      ? "1"
      : String(defaults.recurringEstimatedWorkers)
  );
  const [followUpPreset, setFollowUpPreset] = useState<FollowUpPreset>(
    defaults.followUpDate ? "MANUAL" : "NONE"
  );
  const [followUpDate, setFollowUpDate] = useState(defaults.followUpDate ?? "");
  const quote = useMemo(
    () =>
      calculateLeadQuote({
        quoteJobType,
        pricingModel,
        frequency,
        quoteValue: quoteValue ? Number(quoteValue) : null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        estimatedWorkers: estimatedWorkers ? Number(estimatedWorkers) : null,
        customVisitsPerYear: customVisitsPerYear
          ? Number(customVisitsPerYear)
          : null,
        recurringPricingModel,
        recurringFrequency,
        recurringCustomVisitsPerYear: recurringCustomVisitsPerYear
          ? Number(recurringCustomVisitsPerYear)
          : null,
        recurringQuoteValue: recurringQuoteValue
          ? Number(recurringQuoteValue)
          : null,
        recurringHourlyRate: recurringHourlyRate
          ? Number(recurringHourlyRate)
          : null,
        recurringEstimatedHours: recurringEstimatedHours
          ? Number(recurringEstimatedHours)
          : null,
        recurringEstimatedWorkers: recurringEstimatedWorkers
          ? Number(recurringEstimatedWorkers)
          : null,
      }),
    [
      estimatedHours,
      estimatedWorkers,
      customVisitsPerYear,
      frequency,
      hourlyRate,
      pricingModel,
      quoteJobType,
      quoteValue,
      recurringCustomVisitsPerYear,
      recurringEstimatedHours,
      recurringEstimatedWorkers,
      recurringFrequency,
      recurringHourlyRate,
      recurringPricingModel,
      recurringQuoteValue,
    ]
  );

  function chooseJobType(value: LeadQuoteJobTypeValue) {
    if (value === quoteJobType) return;
    setQuoteJobType(value);
    if (value === "ONE_OFF") {
      setPricingModel("FIXED_TOTAL");
      setFrequency("ONCE");
    } else if (value === "RECURRING") {
      setPricingModel("PER_VISIT");
      setFrequency("WEEKLY");
    } else {
      setPricingModel("FIXED_TOTAL");
      setFrequency("ONCE");
      setRecurringPricingModel("PER_VISIT");
      setRecurringFrequency("WEEKLY");
    }
  }

  function chooseFollowUpPreset(value: FollowUpPreset) {
    setFollowUpPreset(value);
    const presetDate = followUpDateForPreset(value);
    if (presetDate) setFollowUpDate(presetDate);
    if (value === "NONE") setFollowUpDate("");
  }

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
            list="lead-area-options"
            defaultValue={defaults.area}
            className="input"
            placeholder="Choose an area or type your own"
            autoComplete="postal-code"
          />
          <datalist id="lead-area-options">
            {leadAreaOptions.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
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

      <FormSection title="Progress" hint="What needs to happen next.">
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
        <Field label="Follow-up">
          <select
            value={followUpPreset}
            onChange={(event) =>
              chooseFollowUpPreset(event.target.value as FollowUpPreset)
            }
            className="input"
          >
            <option value="NONE">No follow-up yet</option>
            <option value="ONE_WEEK">In 1 week</option>
            <option value="TWO_WEEKS">In 2 weeks</option>
            <option value="MANUAL">Choose a date</option>
          </select>
          {followUpPreset === "MANUAL" ? (
            <input
              name="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className="input mt-2"
            />
          ) : (
            <input type="hidden" name="followUpDate" value={followUpDate} />
          )}
          {followUpDate && followUpPreset !== "MANUAL" && (
            <p className="mt-1 text-xs text-stone-500">
              Follow up on {followUpDate}
            </p>
          )}
        </Field>
        <Field label="Site visit date">
          <input
            name="siteVisitDate"
            type="date"
            defaultValue={defaults.siteVisitDate}
            className="input"
          />
        </Field>
        <div className="sm:col-span-2 grid gap-2">
          <ProgressTick
            name="verbalQuoteGiven"
            label="Verbal quote given"
            defaultChecked={defaults.verbalQuoteGiven}
          />
          <ProgressTick
            name="verbalQuoteAgreed"
            label="Verbal quote agreed"
            defaultChecked={defaults.verbalQuoteAgreed}
          />
          <ProgressTick
            name="formalEstimateSent"
            label="Formal estimate sent"
            defaultChecked={defaults.formalEstimateSent}
          />
        </div>
      </FormSection>

      <FormSection
        title="Quote & pricing"
        hint="Record what the customer is actually buying, not just one unexplained number."
      >
        <input type="hidden" name="quoteJobType" value={quoteJobType} />
        <input type="hidden" name="pricingModel" value={pricingModel} />
        <input type="hidden" name="frequency" value={frequency} />

        <div className="sm:col-span-2">
          <label className="label">Type of work</label>
          <div className="grid gap-2 sm:grid-cols-3">
            <ChoiceButton
              active={quoteJobType === "ONE_OFF"}
              onClick={() => chooseJobType("ONE_OFF")}
              title="One-off job"
              hint="Patio, fencing, clearance..."
            />
            <ChoiceButton
              active={quoteJobType === "RECURRING"}
              onClick={() => chooseJobType("RECURRING")}
              title="Repeat maintenance"
              hint="Regular ongoing visits"
            />
            <ChoiceButton
              active={quoteJobType === "BOTH"}
              onClick={() => chooseJobType("BOTH")}
              title="One-off + maintenance"
              hint="Initial work, then regular visits"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label">
            {quoteJobType === "BOTH"
              ? "Initial one-off work"
              : "How is it priced?"}
          </label>
          <div className="flex flex-wrap gap-2">
            {quoteJobType !== "RECURRING" ? (
              <>
                <PricingButton
                  active={pricingModel === "FIXED_TOTAL"}
                  onClick={() => setPricingModel("FIXED_TOTAL")}
                >
                  Fixed total
                </PricingButton>
                <PricingButton
                  active={pricingModel === "HOURLY"}
                  onClick={() => setPricingModel("HOURLY")}
                >
                  Hourly estimate
                </PricingButton>
              </>
            ) : (
              <>
                <PricingButton
                  active={pricingModel === "PER_VISIT"}
                  onClick={() => setPricingModel("PER_VISIT")}
                >
                  Per visit
                </PricingButton>
                <PricingButton
                  active={pricingModel === "HOURLY"}
                  onClick={() => setPricingModel("HOURLY")}
                >
                  Hourly
                </PricingButton>
                <PricingButton
                  active={pricingModel === "MONTHLY"}
                  onClick={() => setPricingModel("MONTHLY")}
                >
                  Monthly fee
                </PricingButton>
              </>
            )}
          </div>
        </div>

        {quoteJobType === "RECURRING" && (
          <>
            <Field label="How often?">
              <select
                value={frequency}
                onChange={(event) =>
                  setFrequency(event.target.value as LeadFrequencyValue)
                }
                className="input"
              >
                {LEAD_FREQUENCIES.filter((value) => value !== "ONCE").map(
                  (value) => (
                    <option key={value} value={value}>
                      {leadFrequencyLabels[value]}
                    </option>
                  )
                )}
              </select>
            </Field>
            {frequency === "CUSTOM" && (
              <>
                <Field label="Visits per year">
                  <input
                    name="customVisitsPerYear"
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={customVisitsPerYear}
                    onChange={(event) =>
                      setCustomVisitsPerYear(event.target.value)
                    }
                    className="input"
                    placeholder="e.g. 8"
                    required
                  />
                </Field>
                <Field label="Frequency detail" wide>
                  <input
                    name="frequencyDetail"
                    defaultValue={defaults.frequencyDetail}
                    className="input"
                    placeholder="e.g. monthly in summer, every 8 weeks in winter"
                  />
                </Field>
              </>
            )}
          </>
        )}

        {pricingModel === "HOURLY" ? (
          <>
            <Field label="Hourly rate (£)">
              <input
                name="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
                className="input"
                placeholder="e.g. 30"
              />
            </Field>
            <Field label="People">
              <select
                name="estimatedWorkers"
                value={estimatedWorkers}
                onChange={(event) => setEstimatedWorkers(event.target.value)}
                className="input"
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </Field>
            <Field
              label={
                quoteJobType === "RECURRING"
                  ? "Hours per visit"
                  : "Estimated hours"
              }
              wide
            >
              <input
                name="estimatedHours"
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                className="input"
                placeholder="e.g. 3"
              />
            </Field>
          </>
        ) : (
          <Field
            label={
              pricingModel === "MONTHLY"
                ? "Monthly fee (£)"
                : pricingModel === "PER_VISIT"
                  ? "Price per visit (£)"
                  : "Total quote (£)"
            }
            wide
          >
            <input
              name="quoteValue"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={quoteValue}
              onChange={(event) => setQuoteValue(event.target.value)}
              className="input"
              placeholder="0.00"
            />
          </Field>
        )}

        {quoteJobType === "BOTH" && (
          <>
            <input
              type="hidden"
              name="recurringPricingModel"
              value={recurringPricingModel}
            />
            <input
              type="hidden"
              name="recurringFrequency"
              value={recurringFrequency}
            />
            <div className="sm:col-span-2 mt-2 border-t border-stone-200 pt-4">
              <label className="label">Ongoing maintenance</label>
              <div className="flex flex-wrap gap-2">
                <PricingButton
                  active={recurringPricingModel === "PER_VISIT"}
                  onClick={() => setRecurringPricingModel("PER_VISIT")}
                >
                  Per visit
                </PricingButton>
                <PricingButton
                  active={recurringPricingModel === "HOURLY"}
                  onClick={() => setRecurringPricingModel("HOURLY")}
                >
                  Hourly
                </PricingButton>
                <PricingButton
                  active={recurringPricingModel === "MONTHLY"}
                  onClick={() => setRecurringPricingModel("MONTHLY")}
                >
                  Monthly fee
                </PricingButton>
              </div>
            </div>

            <Field label="How often?">
              <select
                value={recurringFrequency}
                onChange={(event) =>
                  setRecurringFrequency(
                    event.target.value as LeadFrequencyValue
                  )
                }
                className="input"
              >
                {LEAD_FREQUENCIES.filter((value) => value !== "ONCE").map(
                  (value) => (
                    <option key={value} value={value}>
                      {leadFrequencyLabels[value]}
                    </option>
                  )
                )}
              </select>
            </Field>

            {recurringFrequency === "CUSTOM" && (
              <>
                <Field label="Visits per year">
                  <input
                    name="recurringCustomVisitsPerYear"
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={recurringCustomVisitsPerYear}
                    onChange={(event) =>
                      setRecurringCustomVisitsPerYear(event.target.value)
                    }
                    className="input"
                    placeholder="e.g. 8"
                    required
                  />
                </Field>
                <Field label="Frequency detail" wide>
                  <input
                    name="recurringFrequencyDetail"
                    defaultValue={defaults.recurringFrequencyDetail}
                    className="input"
                    placeholder="e.g. monthly in summer, every 8 weeks in winter"
                  />
                </Field>
              </>
            )}

            {recurringPricingModel === "HOURLY" ? (
              <>
                <Field label="Maintenance hourly rate (£)">
                  <input
                    name="recurringHourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={recurringHourlyRate}
                    onChange={(event) =>
                      setRecurringHourlyRate(event.target.value)
                    }
                    className="input"
                    placeholder="e.g. 30"
                  />
                </Field>
                <Field label="People">
                  <select
                    name="recurringEstimatedWorkers"
                    value={recurringEstimatedWorkers}
                    onChange={(event) =>
                      setRecurringEstimatedWorkers(event.target.value)
                    }
                    className="input"
                  >
                    {[1, 2, 3, 4].map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Hours per visit" wide>
                  <input
                    name="recurringEstimatedHours"
                    type="number"
                    min="0"
                    step="0.25"
                    inputMode="decimal"
                    value={recurringEstimatedHours}
                    onChange={(event) =>
                      setRecurringEstimatedHours(event.target.value)
                    }
                    className="input"
                    placeholder="e.g. 3"
                  />
                </Field>
              </>
            ) : (
              <Field
                label={
                  recurringPricingModel === "MONTHLY"
                    ? "Maintenance monthly fee (£)"
                    : "Maintenance price per visit (£)"
                }
                wide
              >
                <input
                  name="recurringQuoteValue"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={recurringQuoteValue}
                  onChange={(event) =>
                    setRecurringQuoteValue(event.target.value)
                  }
                  className="input"
                  placeholder="0.00"
                />
              </Field>
            )}
          </>
        )}

        <Field label="Quote sent">
          <input
            name="quoteDate"
            type="date"
            defaultValue={defaults.quoteDate}
            className="input"
          />
        </Field>

        {(quote.oneOffValue != null ||
          quote.perVisitValue != null ||
          quote.monthlyValue != null) && (
          <div className="sm:col-span-2 rounded-2xl bg-brand-50 p-4">
            <div className="eyebrow">Quote summary</div>
            {quoteJobType === "BOTH" ? (
              <div className="mt-1 space-y-1 font-display text-lg font-extrabold text-brand-900">
                {quote.oneOffValue != null && (
                  <div>Initial work · {formatMoney(quote.oneOffValue)}</div>
                )}
                {quote.perVisitValue != null && (
                  <div>Maintenance · {formatMoney(quote.perVisitValue)} per visit</div>
                )}
                {quote.perVisitValue == null && quote.monthlyValue != null && (
                  <div>Maintenance · {formatMoney(quote.monthlyValue)} per month</div>
                )}
              </div>
            ) : (
              <div className="mt-1 font-display text-xl font-extrabold text-brand-900">
                {quote.oneOffValue != null &&
                  `${formatMoney(quote.oneOffValue)} ${
                    pricingModel === "HOURLY" ? "estimated total" : "one-off"
                  }`}
                {quote.perVisitValue != null &&
                  `${formatMoney(quote.perVisitValue)} per visit`}
                {quote.perVisitValue == null &&
                  quote.monthlyValue != null &&
                  `${formatMoney(quote.monthlyValue)} per month`}
              </div>
            )}
            {quote.perVisitValue != null && quote.monthlyValue != null && (
              <div className="ledger mt-1 text-sm font-semibold text-brand-700">
                ≈ {formatMoney(quote.monthlyValue)} per month
              </div>
            )}
            {pricingModel === "HOURLY" &&
              hourlyRate &&
              estimatedHours &&
              estimatedWorkers && (
                <p className="mt-1 text-xs text-stone-500">
                  {estimatedWorkers} × {formatMoney(Number(hourlyRate))}/hr ×{" "}
                  {estimatedHours} hrs
                </p>
              )}
            {quoteJobType === "BOTH" &&
              recurringPricingModel === "HOURLY" &&
              recurringHourlyRate &&
              recurringEstimatedHours &&
              recurringEstimatedWorkers && (
                <p className="mt-1 text-xs text-stone-500">
                  Maintenance: {recurringEstimatedWorkers} ×{" "}
                  {formatMoney(Number(recurringHourlyRate))}/hr ×{" "}
                  {recurringEstimatedHours} hrs
                </p>
              )}
          </div>
        )}
      </FormSection>

      {status === "WON" && (
        <FormSection title="Won job" hint="What was finally agreed with the customer.">
            <Field label="Date won">
              <input
                name="outcomeDate"
                type="date"
                defaultValue={defaults.outcomeDate}
                className="input"
              />
            </Field>
            <Field label="Final agreed amount (£)">
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
            <Field label="Job date">
              <input
                name="jobDate"
                type="date"
                defaultValue={defaults.jobDate}
                className="input"
              />
            </Field>
        </FormSection>
      )}

      {status === "LOST" && (
        <FormSection title="Lost quote" hint="This helps reveal why quotes are not converting.">
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
        </FormSection>
      )}

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

function ChoiceButton({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition-colors ${
        active
          ? "border-brand-700 bg-brand-50 text-brand-900"
          : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-0.5 block text-[11px] text-stone-500">{hint}</span>
    </button>
  );
}

function PricingButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
        active
          ? "border-brand-700 bg-brand-700 text-white"
          : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressTick({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 rounded border-stone-300 accent-green-700"
      />
      {label}
    </label>
  );
}
