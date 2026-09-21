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

type LeadForStats = {
  status: string;
  quoteValue: number | null;
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
  quotedPipelineValue: number;
  dueFollowUps: number;
  won: number;
  lost: number;
  winRate: number | null;
} {
  const won = leads.filter((lead) => lead.status === "WON").length;
  const lost = leads.filter((lead) => lead.status === "LOST").length;
  const decided = won + lost;

  return {
    open: leads.filter((lead) => !closedStatuses.has(lead.status)).length,
    quotedPipelineValue: leads
      .filter((lead) => lead.status === "QUOTED")
      .reduce((sum, lead) => sum + (lead.quoteValue ?? 0), 0),
    dueFollowUps: leads.filter((lead) => isFollowUpDue(lead, today)).length,
    won,
    lost,
    winRate: decided > 0 ? Math.round((won / decided) * 100) : null,
  };
}

export function isLeadStatus(value: string): value is LeadStatusValue {
  return LEAD_STATUSES.includes(value as LeadStatusValue);
}
