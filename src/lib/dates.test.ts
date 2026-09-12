import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  formatMonthYear,
  isSameMonth,
  fromDateInput,
  parseDateParam,
  resolveMoneyRange,
  shiftMoneyPeriod,
  isCurrentMoneyPeriod,
} from "./dates";

describe("addMonths", () => {
  it("steps to the same day next month", () => {
    const next = addMonths(fromDateInput("2026-08-14"), 1);
    assert.equal(next.toISOString().slice(0, 10), "2026-09-14");
  });

  it("clamps to the last day when the target month is shorter", () => {
    const next = addMonths(fromDateInput("2026-01-31"), 1);
    assert.equal(next.toISOString().slice(0, 10), "2026-02-28");
  });
});

describe("formatMonthYear", () => {
  it("names the month in full", () => {
    assert.equal(formatMonthYear(fromDateInput("2026-08-14")), "August 2026");
  });
});

describe("isSameMonth", () => {
  it("is true for two days in the same UK month", () => {
    assert.equal(
      isSameMonth(fromDateInput("2026-08-01"), fromDateInput("2026-08-31")),
      true
    );
  });

  it("is false across a month boundary", () => {
    assert.equal(
      isSameMonth(fromDateInput("2026-08-31"), fromDateInput("2026-09-01")),
      false
    );
  });
});

describe("parseDateParam", () => {
  it("parses a YYYY-MM-DD URL date", () => {
    const parsed = parseDateParam("2026-07-20");
    assert.equal(parsed.toISOString().slice(0, 10), "2026-07-20");
  });

  it("rejects an impossible calendar date", () => {
    const parsed = parseDateParam("2026-13-40");
    assert.notEqual(parsed.toISOString().slice(0, 10), "2026-13-40");
  });
});

describe("resolveMoneyRange", () => {
  it("uses the Monday–Sunday week containing the selected day", () => {
    const range = resolveMoneyRange("week", fromDateInput("2026-09-12"));
    assert.equal(range.from.toISOString().slice(0, 10), "2026-09-07");
    assert.equal(range.to.toISOString().slice(0, 10), "2026-09-13");
    assert.equal(range.label, "7 – 13 Sep 2026");
  });

  it("uses the whole selected month", () => {
    const range = resolveMoneyRange("month", fromDateInput("2026-08-14"));
    assert.equal(range.from.toISOString().slice(0, 10), "2026-08-01");
    assert.equal(range.to.toISOString().slice(0, 10), "2026-08-31");
    assert.equal(range.label, "August 2026");
  });

  it("uses the selected calendar year", () => {
    const range = resolveMoneyRange("year", fromDateInput("2025-11-03"));
    assert.equal(range.from.toISOString().slice(0, 10), "2025-01-01");
    assert.equal(range.to.toISOString().slice(0, 10), "2025-12-31");
    assert.equal(range.label, "2025");
  });
});

describe("shiftMoneyPeriod", () => {
  it("steps a week at a time from the week start", () => {
    const prev = shiftMoneyPeriod("week", fromDateInput("2026-09-12"), -1);
    const next = shiftMoneyPeriod("week", fromDateInput("2026-09-12"), 1);
    assert.equal(prev.toISOString().slice(0, 10), "2026-08-31");
    assert.equal(next.toISOString().slice(0, 10), "2026-09-14");
  });

  it("steps a month at a time from the month start", () => {
    const prev = shiftMoneyPeriod("month", fromDateInput("2026-08-14"), -1);
    const next = shiftMoneyPeriod("month", fromDateInput("2026-08-14"), 1);
    assert.equal(prev.toISOString().slice(0, 10), "2026-07-01");
    assert.equal(next.toISOString().slice(0, 10), "2026-09-01");
  });
});

describe("isCurrentMoneyPeriod", () => {
  const now = fromDateInput("2026-09-12");

  it("is true for this week and false for last week", () => {
    assert.equal(isCurrentMoneyPeriod("week", fromDateInput("2026-09-09"), now), true);
    assert.equal(isCurrentMoneyPeriod("week", fromDateInput("2026-09-01"), now), false);
  });

  it("is true for this month and false for last month", () => {
    assert.equal(isCurrentMoneyPeriod("month", fromDateInput("2026-09-01"), now), true);
    assert.equal(isCurrentMoneyPeriod("month", fromDateInput("2026-08-31"), now), false);
  });
});
