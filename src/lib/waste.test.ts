import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveWaste } from "./waste";

describe("resolveWaste", () => {
  it("uses the price typed on the job", () => {
    assert.deepEqual(resolveWaste(3, 10, 8), {
      bags: 3,
      pricePerBag: 10,
      total: 30,
    });
  });

  it("falls back to the default rather than losing the bags", () => {
    assert.deepEqual(resolveWaste(2, 0, 8), {
      bags: 2,
      pricePerBag: 8,
      total: 16,
    });
  });

  it("is nothing when there are no bags", () => {
    assert.deepEqual(resolveWaste(0, 10, 8), {
      bags: null,
      pricePerBag: null,
      total: 0,
    });
  });

  it("keeps bags even when there is no default to fall back on", () => {
    assert.deepEqual(resolveWaste(2, 0, 0), {
      bags: 2,
      pricePerBag: 0,
      total: 0,
    });
  });

  it("ignores negative input", () => {
    assert.deepEqual(resolveWaste(-4, -2, 8), {
      bags: null,
      pricePerBag: null,
      total: 0,
    });
  });
});
