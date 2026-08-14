import { prisma } from "@/lib/db";
import { marginPercent } from "@/lib/money";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  addDays,
  toDateInput,
  toStoredDay,
  formatWeekRange,
} from "@/lib/dates";

export type RangeSummary = {
  quickIncome: number;
  wasteIncome: number;
  wasteBags: number;
  materialsIncome: number;
  materialsPaid: number;
  materialsProfit: number;
  projectIncome: number;
  revenue: number;
  overheadCosts: number;
  projectCosts: number;
  labourCosts: number;
  revenueShareCosts: number;
  costs: number;
  profit: number;
  jobsDone: number;
};

/**
 * Cash-basis summary for a date range:
 *  revenue = completed quick jobs + project payments received
 *  costs   = overheads + project costs + extra crew + materials we paid for
 *            + revenue share owed on tagged customers' jobs
 *  profit  = revenue - costs
 */
export async function getRangeSummary(from: Date, to: Date): Promise<RangeSummary> {
  const gte = startOfDay(from);
  const lte = endOfDay(to);

  const [doneJobs, payments, overheads, projectCosts, labour] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { status: "DONE", date: { gte, lte } },
      select: {
        price: true,
        wasteBags: true,
        wasteBagPrice: true,
        materialsCharge: true,
        materialsPaid: true,
        customer: {
          select: {
            revenueShare: { select: { percent: true, active: true } },
          },
        },
      },
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
      select: { amount: true, reimbursable: true },
    }),
    prisma.crewLabour.findMany({
      where: { date: { gte, lte } },
      select: { amount: true },
    }),
  ]);

  const quickIncome = sum(doneJobs.map((j) => j.price));
  // Waste / materials charges are billed inside each job's price; track as subsets
  // so we can see the split without double-counting revenue.
  const wasteIncome = sum(
    doneJobs.map((j) => (j.wasteBags ?? 0) * (j.wasteBagPrice ?? 0))
  );
  const wasteBags = sum(doneJobs.map((j) => j.wasteBags ?? 0));
  const materialsIncome = sum(doneJobs.map((j) => j.materialsCharge ?? 0));
  const materialsPaid = sum(doneJobs.map((j) => j.materialsPaid ?? 0));
  const projectIncome = sum(payments.map((p) => p.amount));
  const overheadCosts = sum(overheads.map((o) => o.amount));
  const projectCostsTotal = sum(
    projectCosts.filter((c) => !c.reimbursable).map((c) => c.amount)
  );
  const labourCosts = sum(labour.map((l) => l.amount));
  const revenueShareCosts = revenueShareCostForJobs(
    doneJobs.map((j) => ({
      price: j.price,
      wasteBags: j.wasteBags,
      wasteBagPrice: j.wasteBagPrice,
      materialsCharge: j.materialsCharge,
      sharePercent:
        j.customer?.revenueShare?.active === true
          ? j.customer.revenueShare.percent
          : null,
    }))
  );

  const revenue = quickIncome + projectIncome;
  const costs =
    overheadCosts +
    projectCostsTotal +
    labourCosts +
    materialsPaid +
    revenueShareCosts;

  return {
    quickIncome,
    wasteIncome,
    wasteBags,
    materialsIncome,
    materialsPaid,
    materialsProfit: materialsIncome - materialsPaid,
    projectIncome,
    revenue,
    overheadCosts,
    projectCosts: projectCostsTotal,
    labourCosts,
    revenueShareCosts,
    costs,
    profit: revenue - costs,
    jobsDone: doneJobs.length,
  };
}

export type PaymentSplit = {
  /** Job takings by how the money arrived. */
  jobCash: number;
  jobCashCount: number;
  jobBank: number;
  jobBankCount: number;
  /** Done jobs with nothing collected yet. */
  jobDue: number;
  jobDueCount: number;
  /** Project payments, bucketed from their free-text method. */
  projectCash: number;
  projectBank: number;
  projectOther: number;
  /** Totals across jobs and projects. */
  cash: number;
  bank: number;
  other: number;
  collected: number;
};

/** Bucket a free-text payment method (project payments) into cash or bank. */
export function bucketPaymentMethod(
  method: string
): "CASH" | "BANK" | "OTHER" {
  const m = method.trim().toLowerCase();
  if (!m) return "OTHER";
  if (m.includes("cash")) return "CASH";
  if (m.includes("bank") || m.includes("transfer") || m.includes("bacs"))
    return "BANK";
  return "OTHER";
}

/**
 * Cash vs bank record for a date range — the split you need for tax returns.
 * Jobs count on the day they were done; project payments on the payment date.
 */
export async function getPaymentSplit(
  from: Date,
  to: Date
): Promise<PaymentSplit> {
  const gte = startOfDay(from);
  const lte = endOfDay(to);

  const [jobs, payments] = await Promise.all([
    prisma.scheduledJob.findMany({
      where: { status: "DONE", date: { gte, lte } },
      select: { price: true, paidAt: true, paymentMethod: true },
    }),
    prisma.payment.findMany({
      where: { date: { gte, lte } },
      select: { amount: true, method: true },
    }),
  ]);

  let jobCash = 0;
  let jobCashCount = 0;
  let jobBank = 0;
  let jobBankCount = 0;
  let jobDue = 0;
  let jobDueCount = 0;

  for (const j of jobs) {
    if (j.paidAt && j.paymentMethod === "CASH") {
      jobCash += j.price;
      jobCashCount += 1;
    } else if (j.paidAt && j.paymentMethod === "BANK") {
      jobBank += j.price;
      jobBankCount += 1;
    } else if (j.price > 0) {
      jobDue += j.price;
      jobDueCount += 1;
    }
  }

  let projectCash = 0;
  let projectBank = 0;
  let projectOther = 0;
  for (const p of payments) {
    const bucket = bucketPaymentMethod(p.method);
    if (bucket === "CASH") projectCash += p.amount;
    else if (bucket === "BANK") projectBank += p.amount;
    else projectOther += p.amount;
  }

  const cash = jobCash + projectCash;
  const bank = jobBank + projectBank;

  return {
    jobCash,
    jobCashCount,
    jobBank,
    jobBankCount,
    jobDue,
    jobDueCount,
    projectCash,
    projectBank,
    projectOther,
    cash,
    bank,
    other: projectOther,
    collected: cash + bank + projectOther,
  };
}

export type ProjectTotals = {
  paid: number;
  costs: number;
  reimbursed: number;
  profit: number;
  margin: number | null;
  quoted: number;
  outstanding: number;
};

export function projectTotals(p: {
  quotedPrice: number;
  costs: { amount: number; reimbursable?: boolean }[];
  payments: { amount: number }[];
}): ProjectTotals {
  const paid = sum(p.payments.map((x) => x.amount));
  const costs = sum(p.costs.filter((x) => !x.reimbursable).map((x) => x.amount));
  const reimbursed = sum(
    p.costs.filter((x) => x.reimbursable).map((x) => x.amount)
  );
  // Use the larger of quoted or paid as the job's value for margin so a job
  // that is quoted but not yet fully paid still shows a sensible margin.
  const revenueBasis = Math.max(p.quotedPrice, paid);
  return {
    paid,
    costs,
    reimbursed,
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

/** One calendar week (Mon–Sun) of a revenue-share deal. */
export type RevenueShareWeekRow = {
  /** Monday of the week, YYYY-MM-DD. */
  weekKey: string;
  /** "20 – 26 Jul" */
  label: string;
  jobs: number;
  labourTakings: number;
  /** Live figure from current job data. */
  shareOwed: number;
  /** Snapshotted figure, set when the week was marked as sent. */
  sentAmount: number | null;
  sentAt: Date | null;
};

export type RevenueShareDealWeeks = {
  id: number;
  name: string;
  percent: number;
  notes: string;
  customerCount: number;
  /** The week we're in now — resets every Monday. */
  current: RevenueShareWeekRow & { lines: RevenueShareLine[] };
  /** Earlier weeks, newest first. Empty weeks that were never sent are skipped. */
  history: RevenueShareWeekRow[];
  /** Everything marked as sent, all time. */
  totalSent: number;
  weeksSent: number;
};

/**
 * Revenue-share cost for jobs in a period: each tagged job contributes
 * (labour takings × deal %). Untagged jobs contribute nothing.
 */
export function revenueShareCostForJobs(
  jobs: {
    price: number;
    wasteBags: number | null;
    wasteBagPrice: number | null;
    materialsCharge?: number | null;
    sharePercent: number | null;
  }[]
): number {
  return toPence(
    sum(
      jobs.map((j) => {
        if (j.sharePercent == null || j.sharePercent <= 0) return 0;
        return (jobLabourTakings(j) * j.sharePercent) / 100;
      })
    )
  );
}

/** Labour takings on a job = price minus waste and materials charges. */
export function jobLabourTakings(job: {
  price: number;
  wasteBags: number | null;
  wasteBagPrice: number | null;
  materialsCharge?: number | null;
}): number {
  const waste = (job.wasteBags ?? 0) * (job.wasteBagPrice ?? 0);
  const materials = job.materialsCharge ?? 0;
  return Math.max(0, job.price - waste - materials);
}

/** Round to whole pence so stored figures match what was displayed. */
function toPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Revenue-share deals broken down by calendar week (Mon–Sun): the week in
 * progress plus the previous `weeksBack` weeks. Each week's figure is the
 * labour takings of DONE jobs for that deal's tagged customers × the percent.
 * Weeks already marked as sent keep their snapshotted amount.
 */
export async function getRevenueShareWeeks({
  weeksBack = 8,
  shareId,
  now = new Date(),
}: {
  weeksBack?: number;
  shareId?: number;
  now?: Date;
} = {}): Promise<RevenueShareDealWeeks[]> {
  const currentWeekStart = startOfWeek(now);
  const firstWeekStart = addDays(currentWeekStart, -7 * weeksBack);

  const deals = await prisma.revenueShare.findMany({
    where: shareId != null ? { id: shareId } : { active: true },
    orderBy: { name: "asc" },
    include: {
      customers: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      weeks: true,
    },
  });
  if (deals.length === 0) return [];

  const customerIds = [
    ...new Set(deals.flatMap((d) => d.customers.map((c) => c.id))),
  ];

  const jobs =
    customerIds.length > 0
      ? await prisma.scheduledJob.findMany({
          where: {
            status: "DONE",
            customerId: { in: customerIds },
            date: {
              gte: startOfDay(firstWeekStart),
              lte: endOfDay(addDays(currentWeekStart, 6)),
            },
          },
          select: {
            customerId: true,
            date: true,
            price: true,
            wasteBags: true,
            wasteBagPrice: true,
            materialsCharge: true,
          },
        })
      : [];

  // weekKey -> customerId -> tally
  const byWeek = new Map<
    string,
    Map<number, { jobs: number; labourTakings: number }>
  >();
  for (const j of jobs) {
    if (j.customerId == null) continue;
    const weekKey = toDateInput(startOfWeek(j.date));
    const week = byWeek.get(weekKey) ?? new Map();
    const cur = week.get(j.customerId) ?? { jobs: 0, labourTakings: 0 };
    cur.jobs += 1;
    cur.labourTakings += jobLabourTakings(j);
    week.set(j.customerId, cur);
    byWeek.set(weekKey, week);
  }

  const weekStarts = Array.from({ length: weeksBack + 1 }, (_, i) =>
    addDays(currentWeekStart, -7 * i)
  );

  return deals.map((deal) => {
    const ids = new Set(deal.customers.map((c) => c.id));
    const nameById = new Map(deal.customers.map((c) => [c.id, c.name]));
    const sentByWeek = new Map(
      deal.weeks.map((w) => [toDateInput(w.weekStart), w])
    );

    const build = (weekStart: Date) => {
      const weekKey = toDateInput(weekStart);
      const tallies = byWeek.get(weekKey);
      const lines: RevenueShareLine[] = [];
      if (tallies) {
        for (const [customerId, v] of tallies) {
          if (!ids.has(customerId)) continue;
          lines.push({
            customerId,
            customerName: nameById.get(customerId) ?? "Customer",
            jobs: v.jobs,
            labourTakings: v.labourTakings,
            shareOwed: toPence((v.labourTakings * deal.percent) / 100),
          });
        }
        lines.sort((a, b) => b.shareOwed - a.shareOwed);
      }
      const labourTakings = sum(lines.map((l) => l.labourTakings));
      const sent = sentByWeek.get(weekKey);
      return {
        row: {
          weekKey,
          label: formatWeekRange(weekStart, addDays(weekStart, 6)),
          jobs: sum(lines.map((l) => l.jobs)),
          labourTakings,
          shareOwed: toPence((labourTakings * deal.percent) / 100),
          sentAmount: sent ? sent.amount : null,
          sentAt: sent ? sent.sentAt : null,
        } satisfies RevenueShareWeekRow,
        lines,
      };
    };

    const current = build(weekStarts[0]);
    const history = weekStarts
      .slice(1)
      .map((w) => build(w).row)
      .filter((r) => r.jobs > 0 || r.sentAmount != null);

    return {
      id: deal.id,
      name: deal.name,
      percent: deal.percent,
      notes: deal.notes,
      customerCount: deal.customers.length,
      current: { ...current.row, lines: current.lines },
      history,
      totalSent: sum(deal.weeks.map((w) => w.amount)),
      weeksSent: deal.weeks.length,
    };
  });
}

/**
 * Recompute one deal's figure for one calendar week. Used when settling a week
 * so the stored amount always comes from the server, not the form.
 */
export async function computeRevenueShareWeek(
  shareId: number,
  weekStart: Date
): Promise<{ jobs: number; labourTakings: number; amount: number } | null> {
  const deal = await prisma.revenueShare.findUnique({
    where: { id: shareId },
    include: { customers: { select: { id: true } } },
  });
  if (!deal) return null;

  const ids = deal.customers.map((c) => c.id);
  if (ids.length === 0) return { jobs: 0, labourTakings: 0, amount: 0 };

  const monday = toStoredDay(startOfWeek(weekStart));
  const jobs = await prisma.scheduledJob.findMany({
    where: {
      status: "DONE",
      customerId: { in: ids },
      date: { gte: startOfDay(monday), lte: endOfDay(addDays(monday, 6)) },
    },
    select: {
      price: true,
      wasteBags: true,
      wasteBagPrice: true,
      materialsCharge: true,
    },
  });

  const labourTakings = sum(jobs.map((j) => jobLabourTakings(j)));
  return {
    jobs: jobs.length,
    labourTakings,
    amount: toPence((labourTakings * deal.percent) / 100),
  };
}
