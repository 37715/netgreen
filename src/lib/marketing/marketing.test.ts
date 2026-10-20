import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAds, parseDate, parseEvents, parseNumber, parseProfile } from "./parse";
import { buildMarketingNumbers, failedFeeds, rangeFor, unavailableNumbers } from "./report";
import { summarisePipeline } from "./pipeline";

const TODAY = "2026-10-20";
const RANGE = { start: "2026-09-21", end: TODAY, today: TODAY, channel: "all" as const };

describe("sheet parsing", () => {
  it("maps ads columns by header name, not position", () => {
    const parsed = parseAds([
      ["Impressions", "Date", "Spend GBP", "Clicks", "Campaign", "Conversions"],
      [1000, "2026-10-20", "£12.50", "25", "EHW | Search | Residential | Oct 2026", "2"],
    ]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.rows[0], {
      date: "2026-10-20",
      campaign: "EHW | Search | Residential | Oct 2026",
      impressions: 1000,
      spend: 12.5,
      clicks: 25,
      conversions: 2,
    });
  });

  it("parses GBP amounts and compact dates", () => {
    assert.equal(parseNumber("£1,234.50"), 1234.5);
    assert.equal(parseNumber("1,234"), 1234);
    assert.equal(parseNumber(""), null);
    assert.equal(parseNumber("—"), null);
    assert.equal(parseDate("20261019"), "2026-10-19");
    assert.equal(parseDate("19/10/2026"), "2026-10-19");
    assert.equal(parseDate("2026-02-31"), null);
  });

  it("treats a header-only tab as awaiting data, not zero", () => {
    const report = buildMarketingNumbers(
      {
        ads: [["Date", "Campaign", "Impressions", "Clicks", "Spend GBP", "Conversions"]],
        ga4: [["Date", "Sessions", "Form lead events", "Phone-link clicks"]],
        events: [["date", "event_count", "event_name"]],
        profile: [["date", "impressions", "call_clicks", "website_clicks"]],
      },
      RANGE
    );
    assert.equal(report.spend.kind, "awaiting");
    assert.equal(report.spend.value, null);
    assert.equal(report.sessions.kind, "awaiting");
    assert.equal(report.generateLead.kind, "awaiting");
    assert.equal(report.profileCalls.kind, "awaiting");
    assert.equal(report.adsSeries, null);
  });

  it("sums the 28-day Google Profile export without treating calls as ads conversions", () => {
    const rows: Array<Array<string | number>> = [
      ["date", "impressions", "call_clicks", "website_clicks"],
    ];
    for (let day = 0; day < 28; day += 1) {
      const date = new Date(Date.UTC(2026, 8, 22 + day));
      const iso = date.toISOString().slice(0, 10);
      rows.push([
        iso,
        day === 0 ? 144 : 1,
        day < 2 ? 1 : 0,
        day < 6 ? 1 : 0,
      ]);
    }
    const parsed = parseProfile(rows);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 28);
    const report = buildMarketingNumbers(
      { ads: [], ga4: [], events: [], profile: rows },
      { start: "2026-09-22", end: "2026-10-19", today: "2026-10-20", channel: "all" }
    );
    assert.equal(report.profileImpressions.value, 171);
    assert.equal(report.profileCalls.value, 2);
    assert.equal(report.profileWebsiteClicks.value, 6);
    assert.equal(report.adsConversions.kind, "awaiting");
    assert.equal(report.feeds.find((feed) => feed.id === "profile")?.status, "reporting");
  });

  it("dedupes campaign rows and ignores stale GA4 placeholder columns", () => {
    const report = buildMarketingNumbers(
      {
        ads: [
          ["Campaign", "Date", "Spend", "Clicks", "Impressions", "Conversions"],
          ["EHW | Search | Residential | Oct 2026", "20261020", 10, 4, 100, 1],
          ["EHW | Search | Residential | Oct 2026", "2026-10-20", "£5.00", 1, 20, 0],
          ["EHW | Search | Commercial | Oct 2026", "2026-10-20", 8, 2, 40, 1],
        ],
        ga4: [
          ["Date", "Sessions", "Form lead events", "Phone-link clicks"],
          ["2026-10-20", 30, 99, 99],
        ],
        events: [
          ["date", "event_name", "event_count"],
          ["2026-10-20", "generate_lead", 3],
          ["2026-10-20", "generate_lead", 1],
          ["2026-10-20", "page_view", 40],
          ["2026-10-20", "click_to_call", 2],
        ],
        profile: [],
      },
      { start: TODAY, end: TODAY, today: TODAY, channel: "all" }
    );
    assert.equal(report.campaigns[0].spend, 15);
    assert.equal(report.campaigns[0].clicks, 5);
    assert.equal(report.spend.value, 23);
    assert.equal(report.sessions.value, 30);
    assert.equal(report.generateLead.value, 4);
    assert.equal(report.clickToCall.value, 2);
    assert.equal(report.cpc, 23 / 7);
    assert.equal(report.cpa, 23 / 2);
  });

  it("keeps a stale feed visible and excludes dates outside the window", () => {
    const report = buildMarketingNumbers(
      {
        ads: [
          ["date", "campaign", "spend", "clicks", "impressions", "conversions"],
          ["2026-10-13", "EHW | Search | Residential | Oct 2026", 1, 1, 10, 0],
          ["2026-10-14", "EHW | Search | Residential | Oct 2026", 4, 2, 20, 1],
        ],
        ga4: [],
        events: [],
        profile: [["date", "impressions"], ["2026-09-01", 10]],
      },
      { ...rangeFor(7, new Date("2026-10-20T12:00:00Z")), today: TODAY, channel: "residential" }
    );
    assert.deepEqual(rangeFor(7, new Date("2026-10-20T12:00:00Z")), {
      start: "2026-10-14",
      end: "2026-10-20",
    });
    assert.equal(report.spend.value, 4);
    assert.equal(report.adsSeries?.length, 1);
    assert.equal(report.feeds.find((feed) => feed.id === "profile")?.status, "stale");
    const commercial = buildMarketingNumbers(
      {
        ads: [
          ["date", "campaign", "spend", "clicks", "impressions", "conversions"],
          ["2026-10-20", "EHW | Search | Residential | Oct 2026", 4, 2, 20, 1],
        ],
        ga4: [],
        events: [],
        profile: [],
      },
      { start: TODAY, end: TODAY, today: TODAY, channel: "commercial" }
    );
    assert.equal(commercial.spend.kind, "empty-range");
  });

  it("does not turn an API refusal into zero metrics", () => {
    const feeds = failedFeeds("Google Sheets refused access (403).");
    assert.equal(feeds.every((feed) => feed.status === "error"), true);
    assert.equal(unavailableNumbers(feeds).spend.kind, "error");
    assert.equal(unavailableNumbers(feeds).spend.value, null);
    const report = buildMarketingNumbers(
      { ads: [], ga4: [], events: [], profile: [] },
      RANGE
    );
    assert.notEqual(report.spend.kind, "value");
  });

  it("counts events only and leaves an empty GA4 events tab awaiting", () => {
    const parsed = parseEvents([
      ["date", "event_name", "event_count"],
      ["2026-10-20", "session_start", 8],
    ]);
    assert.equal(parsed.ok, true);
    const report = buildMarketingNumbers(
      {
        ads: [],
        ga4: [],
        events: [
          ["date", "event_name", "event_count"],
          ["2026-10-20", "session_start", 8],
        ],
        profile: [],
      },
      { start: TODAY, end: TODAY, today: TODAY, channel: "all" }
    );
    assert.equal(report.generateLead.kind, "empty-range");
    assert.equal(report.clickToCall.kind, "empty-range");
  });
});

describe("sales attribution", () => {
  it("keeps won Netgreen jobs separate from advertising conversions", () => {
    const summary = summarisePipeline(
      [
        {
          status: "WON",
          source: "Referral",
          createdAt: new Date("2026-10-18T12:00:00Z"),
          outcomeDate: new Date("2026-10-19T12:00:00Z"),
          followUpDate: null,
          finalJobValue: 800,
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          quoteValue: 800,
        },
        {
          status: "QUOTED",
          source: "Website",
          createdAt: new Date("2026-10-10T12:00:00Z"),
          outcomeDate: null,
          followUpDate: new Date("2026-10-01T12:00:00Z"),
          finalJobValue: null,
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          quoteValue: 450,
        },
      ],
      "2026-10-14",
      "2026-10-20",
      new Date("2026-10-20T12:00:00Z")
    );
    assert.equal(summary.wonInPeriod, 1);
    assert.equal(summary.knownWonValue, 800);
    assert.equal(summary.oneOffQuotedValue, 450);
    assert.equal(summary.overdueFollowUps, 1);
    assert.equal(summary.sources[0].source, "Referral");
    assert.equal(summary.stages.WON, 1);
    assert.equal(summary.stages.QUOTED, 1);
  });
});
