import { prisma } from "@/lib/db";
import { marginPercent } from "@/lib/money";
import { startOfDay, endOfDay } from "@/lib/dates";

export type RangeSummary = {
  quickIncome: number;
  wasteIncome: number;
  projectIncome: number;
  revenue: number;
  overheadCosts: number;
  projectCosts: number;
  labourCosts: number;
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

  const [doneJobs, payments, overheads, projectCosts, labour] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { status: "DONE", date: { gte, lte } },
      select: { price: true, wasteBags: true, wasteBagPrice: true },
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
    prisma.crewLabour.findMany({
      where: { date: { gte, lte } },
      select: { amount: true },
    }),
  ]);

  const quickIncome = sum(doneJobs.map((j) => j.price));
  // Waste removal is billed inside each job's price; track it as a subset so we can
  // see how much of the quick-job income comes from waste, without double-counting.
  const wasteIncome = sum(
    doneJobs.map((j) => (j.wasteBags ?? 0) * (j.wasteBagPrice ?? 0))
  );
  const projectIncome = sum(payments.map((p) => p.amount));
  const overheadCosts = sum(overheads.map((o) => o.amount));
  const projectCostsTotal = sum(projectCosts.map((c) => c.amount));
  const labourCosts = sum(labour.map((l) => l.amount));

  const revenue = quickIncome + projectIncome;
  const costs = overheadCosts + projectCostsTotal + labourCosts;

  return {
    quickIncome,
    wasteIncome,
    projectIncome,
    revenue,
    overheadCosts,
    projectCosts: projectCostsTotal,
    labourCosts,
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

export type RevenueShareLine = {
  customerId: number;
  customerName: string;
  jobs: number;
  labourTakings: number;
  shareOwed: number;
};

export type RevenueSharePayout = {
  id: number;
  name: string;
  percent: number;
  customerCount: number;
  jobs: number;
  labourTakings: number;
  shareOwed: number;
  lines: RevenueShareLine[];
};

/** Labour takings on a job = price minus logged waste (materials not tracked on rounds). */
export function jobLabourTakings(job: {
  price: number;
  wasteBags: number | null;
  wasteBagPrice: number | null;
}): number {
  const waste = (job.wasteBags ?? 0) * (job.wasteBagPrice ?? 0);
  return Math.max(0, job.price - waste);
}

/**
 * For each active revenue-share deal, sum labour takings from DONE calendar
 * jobs for tagged customers in [from, to], then apply the deal percent.
 */
export async function getRevenueSharePayouts(
  from: Date,
  to: Date
): Promise<RevenueSharePayout[]> {
  const gte = startOfDay(from);
  const lte = endOfDay(to);

  const deals = await prisma.revenueShare.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      customers: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });

  if (deals.length === 0) return [];

  const customerIds = deals.flatMap((d) => d.customers.map((c) => c.id));
  if (customerIds.length === 0) {
    return deals.map((d) => ({
      id: d.id,
      name: d.name,
      percent: d.percent,
      customerCount: 0,
      jobs: 0,
      labourTakings: 0,
      shareOwed: 0,
      lines: [],
    }));
  }

  const jobs = await prisma.scheduledJob.findMany({
    where: {
      status: "DONE",
      date: { gte, lte },
      customerId: { in: customerIds },
    },
    select: {
      customerId: true,
      price: true,
      wasteBags: true,
      wasteBagPrice: true,
    },
  });

  return deals.map((deal) => {
    const ids = new Set(deal.customers.map((c) => c.id));
    const nameById = new Map(deal.customers.map((c) => [c.id, c.name]));
    const byCustomer = new Map<
      number,
      { jobs: number; labourTakings: number }
    >();

    for (const j of jobs) {
      if (j.customerId == null || !ids.has(j.customerId)) continue;
      const labour = jobLabourTakings(j);
      const cur = byCustomer.get(j.customerId) ?? { jobs: 0, labourTakings: 0 };
      cur.jobs += 1;
      cur.labourTakings += labour;
      byCustomer.set(j.customerId, cur);
    }

    const lines: RevenueShareLine[] = [...byCustomer.entries()]
      .map(([customerId, v]) => ({
        customerId,
        customerName: nameById.get(customerId) ?? "Customer",
        jobs: v.jobs,
        labourTakings: v.labourTakings,
        shareOwed: (v.labourTakings * deal.percent) / 100,
      }))
      .sort((a, b) => b.shareOwed - a.shareOwed);

    const labourTakings = sum(lines.map((l) => l.labourTakings));
    return {
      id: deal.id,
      name: deal.name,
      percent: deal.percent,
      customerCount: deal.customers.length,
      jobs: sum(lines.map((l) => l.jobs)),
      labourTakings,
      shareOwed: (labourTakings * deal.percent) / 100,
      lines,
    };
  });
}
