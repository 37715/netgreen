import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addMonths, formatMonthYear, isSameMonth, fromDateInput } from "./dates";

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
