import { addDays, calendarDayKey } from "@/lib/dates";
import {
  type AdsRow,
  type Cell,
  type EventRow,
  type Ga4Row,
  type ParseResult,
  type ProfileRow,
  parseAds,
  parseEvents,
  parseGa4,
  parseProfile,
} from "@/lib/marketing/parse";

export const AD_BUDGET_SETTINGS = [
  {
    channel: "residential" as const,
    name: "EHW | Search | Residential | Oct 2026",
    dailyGbp: 17.27,
  },
  {
    channel: "commercial" as const,
    name: "EHW | Search | Commercial | Oct 2026",
    dailyGbp: 7.4,
  },
];

export type Channel = "all" | "residential" | "commercial";
export type RangeDays = 7 | 30 | 90;
export type FeedStatus = "reporting" | "stale" | "awaiting" | "error";

export type FeedHealth = {
  id: "ads" | "ga4" | "events" | "profile";
  label: string;
  status: FeedStatus;
  lastDate: string | null;
  rowCount: number;
  message: string | null;
};

export type MetricKind = "value" | "awaiting" | "error" | "empty-range";

export type Metric = {
  kind: MetricKind;
  value: number | null;
};

export type CampaignRow = {
  name: string;
  channel: Exclude<Channel, "all"> | "other";
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  dailyBudget: number | null;
};

export type AdsPoint = {
  date: string;
  campaign: string;
  spend: number;
  conversions: number;
};

export type ProfilePoint = {
  date: string;
  impressions: number;
  callClicks: number;
  websiteClicks: number;
};

export type MarketingNumbers = {
  feeds: FeedHealth[];
  spend: Metric;
  impressions: Metric;
  clicks: Metric;
  adsConversions: Metric;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  sessions: Metric;
  generateLead: Metric;
  clickToCall: Metric;
  profileImpressions: Metric;
  profileCalls: Metric;
  profileWebsiteClicks: Metric;
  campaigns: CampaignRow[];
  adsSeries: AdsPoint[] | null;
  profileSeries: ProfilePoint[] | null;
};

export type SheetGrids = {
  ads: Cell[][];
  ga4: Cell[][];
  events: Cell[][];
  profile: Cell[][];
};

export function rangeFor(days: RangeDays, today = new Date()): { start: string; end: string } {
  const end = calendarDayKey(today);
  const start = calendarDayKey(addDays(today, -(days - 1)));
  return { start, end };
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function channelOf(campaign: string): Exclude<Channel, "all"> | "other" {
  if (/residential/i.test(campaign)) return "residential";
  if (/commercial/i.test(campaign)) return "commercial";
  return "other";
}

export function dailyBudgetFor(campaign: string): number | null {
  const channel = channelOf(campaign);
  return AD_BUDGET_SETTINGS.find((item) => item.channel === channel)?.dailyGbp ?? null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function addNullable(left: number | null, right: number | null): number | null {
  if (left == null && right == null) return null;
  return (left ?? 0) + (right ?? 0);
}

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function hasAny(values: Array<number | null>): boolean {
  return values.some((value) => value != null);
}

function metricFrom(
  feed: FeedHealth,
  inRangeCount: number,
  value: number,
  present: boolean
): Metric {
  if (feed.status === "error") return { kind: "error", value: null };
  if (feed.status === "awaiting") return { kind: "awaiting", value: null };
  if (inRangeCount === 0 || !present) return { kind: "empty-range", value: null };
  return { kind: "value", value };
}

function assess(
  id: FeedHealth["id"],
  label: string,
  parsed: ParseResult<{ date: string }>,
  today: string
): { health: FeedHealth; dates: string[] } {
  if (!parsed.ok) {
    return {
      health: { id, label, status: "error", lastDate: null, rowCount: 0, message: parsed.error },
      dates: [],
    };
  }
  if (parsed.rows.length === 0) {
    return {
      health: {
        id,
        label,
        status: "awaiting",
        lastDate: null,
        rowCount: 0,
        message: "Awaiting first import",
      },
      dates: [],
    };
  }
  const dates = parsed.rows.map((row) => row.date).sort();
  const lastDate = dates[dates.length - 1];
  const staleBefore = calendarDayKey(addDays(new Date(`${today}T12:00:00Z`), -3));
  return {
    health: {
      id,
      label,
      status: lastDate < staleBefore ? "stale" : "reporting",
      lastDate,
      rowCount: parsed.rows.length,
      message: null,
    },
    dates,
  };
}

function dedupeAds(rows: AdsRow[]): AdsRow[] {
  const grouped = new Map<string, AdsRow>();
  for (const row of rows) {
    const key = `${row.date}|${row.campaign.toLowerCase()}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...row });
      continue;
    }
    current.clicks = addNullable(current.clicks, row.clicks);
    current.spend = addNullable(current.spend, row.spend);
    current.impressions = addNullable(current.impressions, row.impressions);
    current.conversions = addNullable(current.conversions, row.conversions);
  }
  return [...grouped.values()];
}

function dedupeByDate<T extends { date: string }>(
  rows: T[],
  merge: (left: T, right: T) => T
): T[] {
  const grouped = new Map<string, T>();
  for (const row of rows) {
    const current = grouped.get(row.date);
    grouped.set(row.date, current ? merge(current, row) : { ...row });
  }
  return [...grouped.values()];
}

export function buildMarketingNumbers(
  grids: SheetGrids,
  options: { start: string; end: string; today: string; channel: Channel }
): MarketingNumbers {
  const adsParsed = parseAds(grids.ads);
  const ga4Parsed = parseGa4(grids.ga4);
  const eventsParsed = parseEvents(grids.events);
  const profileParsed = parseProfile(grids.profile);
  const adsHealth = assess("ads", "Google Ads", adsParsed, options.today);
  const ga4Health = assess("ga4", "GA4 sessions", ga4Parsed, options.today);
  const eventsHealth = assess("events", "GA4 events", eventsParsed, options.today);
  const profileHealth = assess("profile", "Google Business Profile", profileParsed, options.today);

  const adsRows = adsParsed.ok
    ? dedupeAds(adsParsed.rows).filter(
        (row) =>
          inRange(row.date, options.start, options.end) &&
          (options.channel === "all" || channelOf(row.campaign) === options.channel)
      )
    : [];
  const ga4Rows = ga4Parsed.ok
    ? dedupeByDate(ga4Parsed.rows, (left, right) => ({
        date: left.date,
        sessions: addNullable(left.sessions, right.sessions),
      })).filter((row) => inRange(row.date, options.start, options.end))
    : [];
  const eventRows = eventsParsed.ok
    ? eventsParsed.rows.filter((row) => inRange(row.date, options.start, options.end))
    : [];
  const profileRows = profileParsed.ok
    ? dedupeByDate(profileParsed.rows, (left, right) => ({
        date: left.date,
        impressions: addNullable(left.impressions, right.impressions),
        callClicks: addNullable(left.callClicks, right.callClicks),
        websiteClicks: addNullable(left.websiteClicks, right.websiteClicks),
      })).filter((row) => inRange(row.date, options.start, options.end))
    : [];

  const spend = sum(adsRows.map((row) => row.spend));
  const clicks = sum(adsRows.map((row) => row.clicks));
  const impressions = sum(adsRows.map((row) => row.impressions));
  const conversions = sum(adsRows.map((row) => row.conversions));
  const spendMetric = metricFrom(adsHealth.health, adsRows.length, spend, hasAny(adsRows.map((row) => row.spend)));
  const clicksMetric = metricFrom(adsHealth.health, adsRows.length, clicks, hasAny(adsRows.map((row) => row.clicks)));
  const impressionsMetric = metricFrom(
    adsHealth.health,
    adsRows.length,
    impressions,
    hasAny(adsRows.map((row) => row.impressions))
  );
  const conversionsMetric = metricFrom(
    adsHealth.health,
    adsRows.length,
    conversions,
    hasAny(adsRows.map((row) => row.conversions))
  );

  const campaigns = campaignRows(adsRows);
  const eventCount = (name: string) =>
    eventRows
      .filter((row) => row.eventName.toLowerCase() === name)
      .reduce((total, row) => total + (row.eventCount ?? 0), 0);
  const namedEvents = (name: string) =>
    eventRows.filter((row) => row.eventName.toLowerCase() === name);

  return {
    feeds: [adsHealth.health, ga4Health.health, eventsHealth.health, profileHealth.health],
    spend: spendMetric,
    impressions: impressionsMetric,
    clicks: clicksMetric,
    adsConversions: conversionsMetric,
    ctr:
      clicksMetric.kind === "value" && impressionsMetric.kind === "value"
        ? ratio(clicks, impressions)
        : null,
    cpc: spendMetric.kind === "value" && clicksMetric.kind === "value" ? ratio(spend, clicks) : null,
    cpa:
      spendMetric.kind === "value" && conversionsMetric.kind === "value"
        ? ratio(spend, conversions)
        : null,
    sessions: metricFrom(
      ga4Health.health,
      ga4Rows.length,
      sum(ga4Rows.map((row) => row.sessions)),
      hasAny(ga4Rows.map((row) => row.sessions))
    ),
    generateLead: metricFrom(
      eventsHealth.health,
      namedEvents("generate_lead").length,
      eventCount("generate_lead"),
      namedEvents("generate_lead").some((row) => row.eventCount != null)
    ),
    clickToCall: metricFrom(
      eventsHealth.health,
      namedEvents("click_to_call").length,
      eventCount("click_to_call"),
      namedEvents("click_to_call").some((row) => row.eventCount != null)
    ),
    profileImpressions: metricFrom(
      profileHealth.health,
      profileRows.length,
      sum(profileRows.map((row) => row.impressions)),
      hasAny(profileRows.map((row) => row.impressions))
    ),
    profileCalls: metricFrom(
      profileHealth.health,
      profileRows.length,
      sum(profileRows.map((row) => row.callClicks)),
      hasAny(profileRows.map((row) => row.callClicks))
    ),
    profileWebsiteClicks: metricFrom(
      profileHealth.health,
      profileRows.length,
      sum(profileRows.map((row) => row.websiteClicks)),
      hasAny(profileRows.map((row) => row.websiteClicks))
    ),
    campaigns,
    adsSeries:
      adsHealth.health.status === "awaiting" || adsHealth.health.status === "error"
        ? null
        : adsRows
            .map((row) => ({
              date: row.date,
              campaign: row.campaign,
              spend: row.spend ?? 0,
              conversions: row.conversions ?? 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date) || a.campaign.localeCompare(b.campaign)),
    profileSeries:
      profileHealth.health.status === "awaiting" || profileHealth.health.status === "error"
        ? null
        : profileRows
            .map((row) => ({
              date: row.date,
              impressions: row.impressions ?? 0,
              callClicks: row.callClicks ?? 0,
              websiteClicks: row.websiteClicks ?? 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function campaignRows(rows: AdsRow[]): CampaignRow[] {
  const grouped = new Map<string, AdsRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.campaign) ?? [];
    list.push(row);
    grouped.set(row.campaign, list);
  }
  return [...grouped.entries()]
    .map(([name, items]) => {
      const spend = sum(items.map((row) => row.spend));
      const clicks = sum(items.map((row) => row.clicks));
      const impressions = sum(items.map((row) => row.impressions));
      const conversions = sum(items.map((row) => row.conversions));
      return {
        name,
        channel: channelOf(name),
        spend,
        clicks,
        impressions,
        conversions,
        ctr: ratio(clicks, impressions),
        cpc: ratio(spend, clicks),
        cpa: ratio(spend, conversions),
        dailyBudget: dailyBudgetFor(name),
      };
    })
    .sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));
}

export function unavailableNumbers(feeds: FeedHealth[]): MarketingNumbers {
  const error: Metric = { kind: "error", value: null };
  return {
    feeds,
    spend: error,
    impressions: error,
    clicks: error,
    adsConversions: error,
    ctr: null,
    cpc: null,
    cpa: null,
    sessions: error,
    generateLead: error,
    clickToCall: error,
    profileImpressions: error,
    profileCalls: error,
    profileWebsiteClicks: error,
    campaigns: [],
    adsSeries: null,
    profileSeries: null,
  };
}

export function failedFeeds(message: string): FeedHealth[] {
  return [
    ["ads", "Google Ads"],
    ["ga4", "GA4 sessions"],
    ["events", "GA4 events"],
    ["profile", "Google Business Profile"],
  ].map(([id, label]) => ({
    id: id as FeedHealth["id"],
    label,
    status: "error" as const,
    lastDate: null,
    rowCount: 0,
    message,
  }));
}

export type { AdsRow, EventRow, Ga4Row, ProfileRow };
