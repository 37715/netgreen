import { calendarDayKey } from "@/lib/dates";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "QUOTED",
  "WON",
  "LOST",
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const leadStatusLabels: Record<LeadStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT: "Site visit",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
};

export const leadStatusStyles: Record<LeadStatusValue, string> = {
  NEW: "bg-sky-100 text-sky-700",
  CONTACTED: "bg-violet-100 text-violet-700",
  SITE_VISIT: "bg-amber-100 text-amber-700",
  QUOTED: "bg-orange-100 text-orange-700",
  WON: "bg-lime-100 text-lime-700",
  LOST: "bg-stone-200 text-stone-500",
};

export const leadSourceOptions = [
  "Google",
  "Facebook",
  "Referral",
  "Van",
  "Repeat customer",
  "Website",
  "Other",
] as const;

export const leadWorkTypeOptions = [
  "Garden maintenance",
  "Hedge cutting",
  "Patio",
  "Fencing",
  "Clearance",
  "Turfing",
  "Tree work",
  "Other",
] as const;

export const salesmanOptions = ["Howard", "Hugo"] as const;

export const LEAD_QUOTE_JOB_TYPES = ["ONE_OFF", "RECURRING"] as const;
export type LeadQuoteJobTypeValue = (typeof LEAD_QUOTE_JOB_TYPES)[number];

export const LEAD_PRICING_MODELS = [
  "FIXED_TOTAL",
  "PER_VISIT",
  "HOURLY",
  "MONTHLY",
] as const;
export type LeadPricingModelValue = (typeof LEAD_PRICING_MODELS)[number];

export const LEAD_FREQUENCIES = [
  "ONCE",
  "WEEKLY",
  "FORTNIGHTLY",
  "FOUR_WEEKLY",
  "MONTHLY",
  "CUSTOM",
] as const;
export type LeadFrequencyValue = (typeof LEAD_FREQUENCIES)[number];

export const leadFrequencyLabels: Record<LeadFrequencyValue, string> = {
  ONCE: "One-off",
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Every 2 weeks",
  FOUR_WEEKLY: "Every 4 weeks",
  MONTHLY: "Monthly",
  CUSTOM: "Other",
};

export type LeadQuoteInput = {
  quoteJobType?: string;
  pricingModel?: string;
  quoteValue: number | null;
  hourlyRate?: number | null;
  estimatedHours?: number | null;
  estimatedWorkers?: number | null;
  frequency?: string;
};

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function visitsEachMonth(frequency: string): number | null {
  if (frequency === "WEEKLY") return 52 / 12;
  if (frequency === "FORTNIGHTLY") return 26 / 12;
  if (frequency === "FOUR_WEEKLY") return 13 / 12;
  if (frequency === "MONTHLY") return 1;
  return null;
}

export function calculateLeadQuote(input: LeadQuoteInput): {
  oneOffValue: number | null;
  perVisitValue: number | null;
  monthlyValue: number | null;
  visitsPerMonth: number | null;
} {
  const jobType = input.quoteJobType ?? "ONE_OFF";
  const pricingModel = input.pricingModel ?? "FIXED_TOTAL";
  const frequency = input.frequency ?? "ONCE";
  const quoted = positive(input.quoteValue);
  const rate = positive(input.hourlyRate);
  const hours = positive(input.estimatedHours);
  const workers = positive(input.estimatedWorkers);
  const hourlyEstimate =
    rate != null && hours != null && workers != null
      ? roundMoney(rate * hours * workers)
      : null;

  if (jobType !== "RECURRING") {
    return {
      oneOffValue: pricingModel === "HOURLY" ? hourlyEstimate : quoted,
      perVisitValue: null,
      monthlyValue: null,
      visitsPerMonth: null,
    };
  }

  const visitsPerMonth = visitsEachMonth(frequency);
  if (pricingModel === "MONTHLY") {
    return {
      oneOffValue: null,
      perVisitValue: null,
      monthlyValue: quoted,
      visitsPerMonth,
    };
  }

  const perVisitValue = pricingModel === "HOURLY" ? hourlyEstimate : quoted;
  return {
    oneOffValue: null,
    perVisitValue,
    monthlyValue:
      perVisitValue != null && visitsPerMonth != null
        ? roundMoney(perVisitValue * visitsPerMonth)
        : null,
    visitsPerMonth,
  };
}

type LeadForStats = LeadQuoteInput & {
  status: string;
  followUpDate: Date | null;
};

const closedStatuses = new Set(["WON", "LOST"]);

export function isFollowUpDue(
  lead: Pick<LeadForStats, "status" | "followUpDate">,
  today = new Date()
): boolean {
  return Boolean(
    lead.followUpDate &&
      !closedStatuses.has(lead.status) &&
      calendarDayKey(lead.followUpDate) <= calendarDayKey(today)
  );
}

export function calculateLeadStats(
  leads: LeadForStats[],
  today = new Date()
): {
  open: number;
  oneOffQuotedValue: number;
  recurringMonthlyValue: number;
  dueFollowUps: number;
  won: number;
  lost: number;
  winRate: number | null;
} {
  const won = leads.filter((lead) => lead.status === "WON").length;
  const lost = leads.filter((lead) => lead.status === "LOST").length;
  const decided = won + lost;
  const quoted = leads
    .filter((lead) => lead.status === "QUOTED")
    .map(calculateLeadQuote);

  return {
    open: leads.filter((lead) => !closedStatuses.has(lead.status)).length,
    oneOffQuotedValue: roundMoney(
      quoted.reduce((sum, quote) => sum + (quote.oneOffValue ?? 0), 0)
    ),
    recurringMonthlyValue: roundMoney(
      quoted.reduce((sum, quote) => sum + (quote.monthlyValue ?? 0), 0)
    ),
    dueFollowUps: leads.filter((lead) => isFollowUpDue(lead, today)).length,
    won,
    lost,
    winRate: decided > 0 ? Math.round((won / decided) * 100) : null,
  };
}

export function isLeadStatus(value: string): value is LeadStatusValue {
  return LEAD_STATUSES.includes(value as LeadStatusValue);
}
