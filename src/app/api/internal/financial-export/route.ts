import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { materializeOverheads } from "@/lib/overheads";

const exportTokenHash = Buffer.from(
  "cb1b2884d3af629261f9ce306cf9be61483fc5328e856d6fcf613315323f1f27",
  "hex"
);

function hasValidExportToken(request: Request): boolean {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const candidateHash = createHash("sha256").update(token).digest();

  return (
    candidateHash.length === exportTokenHash.length &&
    timingSafeEqual(candidateHash, exportTokenHash)
  );
}

export async function POST(request: Request) {
  if (!hasValidExportToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await materializeOverheads(new Date());

  const [
    settings,
    crews,
    customers,
    jobs,
    projects,
    projectCosts,
    payments,
    overheads,
    crewLabour,
    debts,
    revenueShares,
    revenueShareWeeks,
    leads,
  ] = await Promise.all([
    prisma.settings.findUnique({
      where: { id: 1 },
      select: {
        businessName: true,
        employeeRate: true,
        taxPotPercent: true,
        wasteBagPrice: true,
        currency: true,
        updatedAt: true,
      },
    }),
    prisma.crew.findMany({
      select: {
        id: true,
        name: true,
        members: true,
        active: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        recurrence: true,
        recurrenceAnchor: true,
        defaultPrice: true,
        typicalMinutes: true,
        defaultCrewId: true,
        revenueShareId: true,
        active: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.scheduledJob.findMany({
      select: {
        id: true,
        date: true,
        title: true,
        price: true,
        pricingType: true,
        hourlyRate: true,
        hours: true,
        workers: true,
        wasteBags: true,
        wasteBagPrice: true,
        materialsCharge: true,
        materialsPaid: true,
        materialsNote: true,
        status: true,
        completedAt: true,
        paidAt: true,
        paymentMethod: true,
        customerId: true,
        crewId: true,
        projectId: true,
        recurringSourceCustomerId: true,
        createdAt: true,
        customer: {
          select: {
            revenueShare: {
              select: { id: true, percent: true, active: true },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.project.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        quotedPrice: true,
        startDate: true,
        customerId: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.projectCost.findMany({
      select: {
        id: true,
        projectId: true,
        category: true,
        description: true,
        amount: true,
        reimbursable: true,
        date: true,
        createdAt: true,
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.payment.findMany({
      select: {
        id: true,
        projectId: true,
        amount: true,
        date: true,
        method: true,
        note: true,
        createdAt: true,
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.overhead.findMany({
      select: {
        id: true,
        date: true,
        category: true,
        description: true,
        amount: true,
        recurrence: true,
        recurringSourceId: true,
        createdAt: true,
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.crewLabour.findMany({
      select: {
        id: true,
        date: true,
        crewId: true,
        name: true,
        amount: true,
        createdAt: true,
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.debt.findMany({
      select: {
        id: true,
        amount: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.revenueShare.findMany({
      select: {
        id: true,
        name: true,
        percent: true,
        active: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.revenueShareWeek.findMany({
      select: {
        id: true,
        shareId: true,
        weekStart: true,
        amount: true,
        labourTakings: true,
        jobs: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: [{ weekStart: "asc" }, { id: "asc" }],
    }),
    prisma.lead.findMany({
      select: {
        id: true,
        salesman: true,
        source: true,
        workType: true,
        status: true,
        siteVisitDate: true,
        quoteDate: true,
        quoteJobType: true,
        pricingModel: true,
        frequency: true,
        customVisitsPerYear: true,
        quoteValue: true,
        hourlyRate: true,
        estimatedHours: true,
        estimatedWorkers: true,
        recurringPricingModel: true,
        recurringFrequency: true,
        recurringCustomVisitsPerYear: true,
        recurringQuoteValue: true,
        recurringHourlyRate: true,
        recurringEstimatedHours: true,
        recurringEstimatedWorkers: true,
        outcomeDate: true,
        finalJobValue: true,
        jobDate: true,
        followUpDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  return Response.json(
    {
      exportedAt: new Date().toISOString(),
      settings,
      crews,
      customers,
      jobs,
      projects,
      projectCosts,
      payments,
      overheads,
      crewLabour,
      debts,
      revenueShares,
      revenueShareWeeks,
      leads,
    },
    {
      headers: {
        "Cache-Control": "no-store, private",
      },
    }
  );
}
