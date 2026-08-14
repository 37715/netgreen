import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectTotals, revenueShareCostForJobs } from "./finance";

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

describe("revenueShareCostForJobs", () => {
  it("takes the deal percent of labour takings, not materials or waste", () => {
    const cost = revenueShareCostForJobs([
      {
        price: 140,
        wasteBags: 2,
        wasteBagPrice: 10,
        materialsCharge: 20,
        sharePercent: 12.5,
      },
    ]);
    // Labour = 140 - 20 waste - 20 materials = 100; 12.5% = 12.50
    assert.equal(cost, 12.5);
  });

  it("ignores jobs that are not on a revenue-share deal", () => {
    const cost = revenueShareCostForJobs([
      {
        price: 80,
        wasteBags: null,
        wasteBagPrice: null,
        materialsCharge: null,
        sharePercent: null,
      },
    ]);
    assert.equal(cost, 0);
  });
});
