import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromDateInput } from "./dates";
import {
  calculateLeadQuote,
  calculateLeadStats,
  isFollowUpDue,
} from "./leads";

describe("calculateLeadQuote", () => {
  it("keeps a fixed one-off quote as a single job value", () => {
    assert.deepEqual(
      calculateLeadQuote({
        quoteJobType: "ONE_OFF",
        pricingModel: "FIXED_TOTAL",
        quoteValue: 3500,
        frequency: "ONCE",
      }),
      {
        oneOffValue: 3500,
        perVisitValue: null,
        monthlyValue: null,
        visitsPerMonth: null,
      }
    );
  });

  it("calculates a one-off hourly estimate from workers, rate and hours", () => {
    const quote = calculateLeadQuote({
      quoteJobType: "ONE_OFF",
      pricingModel: "HOURLY",
      quoteValue: null,
      hourlyRate: 35,
      estimatedHours: 6,
      estimatedWorkers: 2,
      frequency: "ONCE",
    });

    assert.equal(quote.oneOffValue, 420);
    assert.equal(quote.perVisitValue, null);
  });

  it("turns a fortnightly per-visit price into a monthly equivalent", () => {
    const quote = calculateLeadQuote({
      quoteJobType: "RECURRING",
      pricingModel: "PER_VISIT",
      quoteValue: 60,
      frequency: "FORTNIGHTLY",
    });

    assert.equal(quote.perVisitValue, 60);
    assert.equal(quote.visitsPerMonth, 26 / 12);
    assert.equal(quote.monthlyValue, 130);
  });

  it("calculates recurring hourly value per visit and per month", () => {
    const quote = calculateLeadQuote({
      quoteJobType: "RECURRING",
      pricingModel: "HOURLY",
      quoteValue: null,
      hourlyRate: 25,
      estimatedHours: 3,
      estimatedWorkers: 2,
      frequency: "WEEKLY",
    });

    assert.equal(quote.perVisitValue, 150);
    assert.equal(quote.monthlyValue, 650);
  });

  it("uses a monthly fee directly without multiplying it by frequency", () => {
    const quote = calculateLeadQuote({
      quoteJobType: "RECURRING",
      pricingModel: "MONTHLY",
      quoteValue: 500,
      frequency: "WEEKLY",
    });

    assert.equal(quote.monthlyValue, 500);
    assert.equal(quote.perVisitValue, null);
  });
});

describe("isFollowUpDue", () => {
  const today = fromDateInput("2026-09-21");

  it("includes open leads due today or earlier", () => {
    assert.equal(
      isFollowUpDue(
        { status: "QUOTED", followUpDate: fromDateInput("2026-09-21") },
        today
      ),
      true
    );
    assert.equal(
      isFollowUpDue(
        { status: "CONTACTED", followUpDate: fromDateInput("2026-09-19") },
        today
      ),
      true
    );
  });

  it("excludes future follow-ups and closed leads", () => {
    assert.equal(
      isFollowUpDue(
        { status: "NEW", followUpDate: fromDateInput("2026-09-22") },
        today
      ),
      false
    );
    assert.equal(
      isFollowUpDue(
        { status: "WON", followUpDate: fromDateInput("2026-09-19") },
        today
      ),
      false
    );
  });
});

describe("calculateLeadStats", () => {
  const today = fromDateInput("2026-09-21");

  it("summarises the open pipeline and decided win rate", () => {
    const stats = calculateLeadStats(
      [
        {
          status: "NEW",
          quoteValue: null,
          followUpDate: fromDateInput("2026-09-21"),
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          frequency: "ONCE",
        },
        {
          status: "QUOTED",
          quoteValue: 1500,
          followUpDate: fromDateInput("2026-09-25"),
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          frequency: "ONCE",
        },
        {
          status: "QUOTED",
          quoteValue: 60,
          followUpDate: null,
          quoteJobType: "RECURRING",
          pricingModel: "PER_VISIT",
          frequency: "FORTNIGHTLY",
        },
        {
          status: "WON",
          quoteValue: 800,
          followUpDate: null,
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          frequency: "ONCE",
        },
        {
          status: "LOST",
          quoteValue: 1200,
          followUpDate: null,
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          frequency: "ONCE",
        },
      ],
      today
    );

    assert.deepEqual(stats, {
      open: 3,
      oneOffQuotedValue: 1500,
      recurringMonthlyValue: 130,
      dueFollowUps: 1,
      won: 1,
      lost: 1,
      winRate: 50,
    });
  });

  it("returns a null win rate until a lead is won or lost", () => {
    const stats = calculateLeadStats(
      [
        {
          status: "SITE_VISIT",
          quoteValue: null,
          followUpDate: null,
          quoteJobType: "ONE_OFF",
          pricingModel: "FIXED_TOTAL",
          frequency: "ONCE",
        },
      ],
      today
    );

    assert.equal(stats.winRate, null);
  });
});
