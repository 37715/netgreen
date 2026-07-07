import { prisma } from "@/lib/db";
import { marginPercent } from "@/lib/money";
import { startOfDay, endOfDay } from "@/lib/dates";

export type RangeSummary = {
  quickIncome: number;
  projectIncome: number;
  revenue: number;
  overheadCosts: number;
  projectCosts: number;
  costs: number;
  profit: number;
  jobsDone: number;
};

/**
 * Cash-basis summary for a date range:
 *  revenue = completed quick jobs + project payments received
 *  costs   = overheads + project costs incurred
 *  profit  = revenue - costs
 */
export async function getRangeSummary(from: Date, to: Date): Promise<RangeSummary> {
  const gte = startOfDay(from);
  const lte = endOfDay(to);

  const [doneJobs, payments, overheads, projectCosts] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { status: "DONE", date: { gte, lte } },
      select: { price: true },
    }),
    prisma.payment.findMany({
      where: { date: { gte, lte } },
      select: { amount: true },
    }),
    prisma.overhead.findMany({
      where: { date: { gte, lte } },
      select: { amount: true },
    }),
    prisma.projectCost.findMany({
      where: { date: { gte, lte } },
      select: { amount: true },
    }),
  ]);

  const quickIncome = sum(doneJobs.map((j) => j.price));
  const projectIncome = sum(payments.map((p) => p.amount));
  const overheadCosts = sum(overheads.map((o) => o.amount));
  const projectCostsTotal = sum(projectCosts.map((c) => c.amount));

  const revenue = quickIncome + projectIncome;
  const costs = overheadCosts + projectCostsTotal;

  return {
    quickIncome,
    projectIncome,
    revenue,
    overheadCosts,
    projectCosts: projectCostsTotal,
    costs,
    profit: revenue - costs,
    jobsDone: doneJobs.length,
  };
}

export type ProjectTotals = {
  paid: number;
  costs: number;
  profit: number;
  margin: number | null;
  quoted: number;
  outstanding: number;
};

export function projectTotals(p: {
  quotedPrice: number;
  costs: { amount: number }[];
  payments: { amount: number }[];
}): ProjectTotals {
  const paid = sum(p.payments.map((x) => x.amount));
  const costs = sum(p.costs.map((x) => x.amount));
  // Use the larger of quoted or paid as the job's value for margin so a job
  // that is quoted but not yet fully paid still shows a sensible margin.
  const revenueBasis = Math.max(p.quotedPrice, paid);
  return {
    paid,
    costs,
    profit: paid - costs,
    margin: marginPercent(revenueBasis, costs),
    quoted: p.quotedPrice,
    outstanding: Math.max(0, p.quotedPrice - paid),
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
