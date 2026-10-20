import { calendarDayKey } from "@/lib/dates";
import {
  calculateLeadStats,
  isFollowUpDue,
  type LeadQuoteInput,
  type LeadStatusValue,
  LEAD_STATUSES,
} from "@/lib/leads";

export type PipelineLead = LeadQuoteInput & {
  status: string;
  source: string;
  createdAt: Date;
  outcomeDate: Date | null;
  followUpDate: Date | null;
  finalJobValue: number | null;
};

export type SourceCount = {
  source: string;
  count: number;
};

export type PipelineSummary = {
  stages: Record<LeadStatusValue, number>;
  open: number;
  oneOffQuotedValue: number;
  recurringMonthlyValue: number;
  overdueFollowUps: number;
  newInPeriod: number;
  wonInPeriod: number;
  knownWonValue: number;
  winsWithoutValue: number;
  sources: SourceCount[];
};

function inPeriod(date: Date | null, start: string, end: string): boolean {
  if (!date) return false;
  const key = calendarDayKey(date);
  return key >= start && key <= end;
}

export function summarisePipeline(
  leads: PipelineLead[],
  start: string,
  end: string,
  today = new Date()
): PipelineSummary {
  const stats = calculateLeadStats(leads, today);
  const stages = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<
    LeadStatusValue,
    number
  >;
  for (const lead of leads) {
    if (LEAD_STATUSES.includes(lead.status as LeadStatusValue)) {
      stages[lead.status as LeadStatusValue] += 1;
    }
  }

  const created = leads.filter((lead) => inPeriod(lead.createdAt, start, end));
  const won = leads.filter(
    (lead) => lead.status === "WON" && inPeriod(lead.outcomeDate ?? lead.createdAt, start, end)
  );
  const knownValues = won
    .map((lead) => lead.finalJobValue)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const sources = new Map<string, number>();
  for (const lead of created) {
    const source = lead.source.trim() || "Not recorded";
    sources.set(source, (sources.get(source) ?? 0) + 1);
  }

  return {
    stages,
    open: stats.open,
    oneOffQuotedValue: stats.oneOffQuotedValue,
    recurringMonthlyValue: stats.recurringMonthlyValue,
    overdueFollowUps: leads.filter((lead) => isFollowUpDue(lead, today)).length,
    newInPeriod: created.length,
    wonInPeriod: won.length,
    knownWonValue: Math.round(knownValues.reduce((sum, value) => sum + value, 0) * 100) / 100,
    winsWithoutValue: won.length - knownValues.length,
    sources: [...sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  };
}
