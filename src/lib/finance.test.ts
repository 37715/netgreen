import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectTotals } from "./finance";

describe("projectTotals", () => {
  it("does not let a reimbursable cost hit profit", () => {
    const t = projectTotals({
      quotedPrice: 0,
      costs: [{ amount: 100, reimbursable: true }],
      payments: [],
    });
    assert.equal(t.costs, 0);
    assert.equal(t.profit, 0);
    assert.equal(t.reimbursed, 100);
  });

  it("still subtracts costs the business actually bears", () => {
    const t = projectTotals({
      quotedPrice: 500,
      costs: [
        { amount: 80, reimbursable: false },
        { amount: 100, reimbursable: true },
      ],
      payments: [{ amount: 200 }],
    });
    assert.equal(t.costs, 80);
    assert.equal(t.profit, 120);
    assert.equal(t.reimbursed, 100);
  });
});
