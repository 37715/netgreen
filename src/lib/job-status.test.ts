import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildJobPaymentGuard, buildJobStatusToggle } from "./job-status";

describe("buildJobStatusToggle", () => {
  const changedAt = new Date("2026-10-31T12:00:00.000Z");

  it("guards the write with the rendered status and version", () => {
    const mutation = buildJobStatusToggle(
      { id: 42, expectedStatus: "SCHEDULED", expectedVersion: 7 },
      changedAt
    );

    assert.deepEqual(mutation.where, {
      id: 42,
      status: "SCHEDULED",
      statusVersion: 7,
    });
    assert.equal(mutation.data.status, "DONE");
    assert.deepEqual(mutation.data.statusVersion, { increment: 1 });
    assert.equal(mutation.data.completedAt, changedAt);
    assert.deepEqual(mutation.event, {
      jobId: 42,
      fromStatus: "SCHEDULED",
      toStatus: "DONE",
    });
  });

  it("turns skipped work into done work", () => {
    const mutation = buildJobStatusToggle(
      { id: 3, expectedStatus: "SKIPPED", expectedVersion: 1 },
      changedAt
    );

    assert.equal(mutation.data.status, "DONE");
  });

  it("requires a current done version to untick and clears payment state", () => {
    const mutation = buildJobStatusToggle(
      { id: 9, expectedStatus: "DONE", expectedVersion: 4 },
      changedAt
    );

    assert.deepEqual(mutation.where, {
      id: 9,
      status: "DONE",
      statusVersion: 4,
    });
    assert.deepEqual(mutation.data, {
      status: "SCHEDULED",
      statusVersion: { increment: 1 },
      completedAt: null,
      paidAt: null,
      paymentMethod: null,
    });
  });
});

describe("buildJobPaymentGuard", () => {
  it("requires the same done row version and advances it", () => {
    const guard = buildJobPaymentGuard(12, 5);

    assert.deepEqual(guard.where, {
      id: 12,
      status: "DONE",
      statusVersion: 5,
    });
    assert.deepEqual(guard.versionIncrement, { increment: 1 });
  });
});
