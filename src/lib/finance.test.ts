import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromDateInput } from "./dates";
import {
  projectTotals,
  revenueShareCostForJobs,
  bucketYearMonths,
  splitJobPayments,
} from "./finance";

describe("splitJobPayments", () => {
  const day = fromDateInput("2026-08-20");

  it("keeps paid-but-no-method out of the still-to-collect pile", () => {
    const s = splitJobPayments([
      { price: 100, paidAt: day, paymentMethod: "CASH" },
      { price: 200, paidAt: day, paymentMethod: "BANK" },
      { price: 50, paidAt: day, paymentMethod: null },
      { price: 70, paidAt: null, paymentMethod: null },
    ]);

    assert.equal(s.jobCash, 100);
    assert.equal(s.jobBank, 200);
    assert.equal(s.jobPaidUnknown, 50);
    assert.equal(s.jobPaidUnknownCount, 1);
    assert.equal(s.jobDue, 70);
    assert.equal(s.jobDueCount, 1);
  });

  it("adds up to the money that was actually taken", () => {
    const jobs = [
      { price: 100, paidAt: day, paymentMethod: "CASH" },
      { price: 50, paidAt: day, paymentMethod: null },
      { price: 70, paidAt: null, paymentMethod: null },
    ];
    const s = splitJobPayments(jobs);
    const paidRevenue = jobs
      .filter((j) => j.paidAt)
      .reduce((sum, j) => sum + j.price, 0);

    assert.equal(s.jobCash + s.jobBank + s.jobPaidUnknown, paidRevenue);
  });
});

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

describe("bucketYearMonths", () => {
  it("puts each month's revenue and profit in its own cell", () => {
    const months = bucketYearMonths(2026, fromDateInput("2026-08-14"), {
      jobs: [
        {
          date: fromDateInput("2026-01-10"),
          price: 100,
          wasteBags: null,
          wasteBagPrice: null,
          materialsCharge: null,
          materialsPaid: 0,
          customer: null,
        },
        {
          date: fromDateInput("2026-02-10"),
          price: 200,
          wasteBags: null,
          wasteBagPrice: null,
          materialsCharge: null,
          materialsPaid: 0,
          customer: null,
        },
      ],
      payments: [],
      overheads: [
        { date: fromDateInput("2026-01-20"), amount: 40, description: "Diesel", category: "FUEL" },
      ],
      projectCosts: [],
      labour: [
        { date: fromDateInput("2026-01-12"), amount: 90, name: "Hugo" },
      ],
    });

    assert.equal(months.length, 12);
    assert.equal(months[0].label, "Jan");
    assert.equal(months[0].revenue, 100);
    assert.equal(months[0].profit, -30);
    assert.deepEqual(months[0].costs, [
      { label: "Hugo", amount: 90 },
      { label: "Diesel", amount: 40 },
    ]);
    assert.equal(months[1].label, "Feb");
    assert.equal(months[1].revenue, 200);
    assert.equal(months[1].profit, 200);
    assert.equal(months[7].isCurrent, true);
    assert.equal(months[8].isFuture, true);
  });
});
