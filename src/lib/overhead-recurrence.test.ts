import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromDateInput, toDateInput } from "./dates";
import { overheadOccurrences } from "./overhead-recurrence";

const keys = (dates: Date[]) => dates.map(toDateInput);

describe("overheadOccurrences", () => {
  it("repeats weekly after the first one", () => {
    const dates = overheadOccurrences(
      "WEEKLY",
      fromDateInput("2026-08-01"),
      fromDateInput("2026-08-22")
    );
    assert.deepEqual(keys(dates), ["2026-08-08", "2026-08-15", "2026-08-22"]);
  });

  it("keeps monthly costs on the same day, clamping short months", () => {
    const dates = overheadOccurrences(
      "MONTHLY",
      fromDateInput("2026-01-31"),
      fromDateInput("2026-04-30")
    );
    assert.deepEqual(keys(dates), ["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("repeats yearly", () => {
    const dates = overheadOccurrences(
      "YEARLY",
      fromDateInput("2024-06-01"),
      fromDateInput("2026-08-24")
    );
    assert.deepEqual(keys(dates), ["2025-06-01", "2026-06-01"]);
  });

  it("gives nothing for a one-off cost", () => {
    const dates = overheadOccurrences(
      "NONE",
      fromDateInput("2026-01-01"),
      fromDateInput("2026-08-24")
    );
    assert.deepEqual(keys(dates), []);
  });

  it("does not run ahead of the cut-off date", () => {
    const dates = overheadOccurrences(
      "MONTHLY",
      fromDateInput("2026-08-01"),
      fromDateInput("2026-08-24")
    );
    assert.deepEqual(keys(dates), []);
  });
});
