import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromDateInput } from "./dates";
import { calculateLeadStats, isFollowUpDue } from "./leads";

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
        },
        {
          status: "QUOTED",
          quoteValue: 1500,
          followUpDate: fromDateInput("2026-09-25"),
        },
        {
          status: "WON",
          quoteValue: 800,
          followUpDate: null,
        },
        {
          status: "LOST",
          quoteValue: 1200,
          followUpDate: null,
        },
      ],
      today
    );

    assert.deepEqual(stats, {
      open: 2,
      quotedPipelineValue: 1500,
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
        },
      ],
      today
    );

    assert.equal(stats.winRate, null);
  });
});
