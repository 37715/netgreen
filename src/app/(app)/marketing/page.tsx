import { prisma } from "@/lib/db";
import { summarisePipeline } from "@/lib/marketing/pipeline";
import {
  buildMarketingNumbers,
  rangeFor,
  unavailableNumbers,
  type Channel,
  type RangeDays,
} from "@/lib/marketing/report";
import { loadMarketingSheets } from "@/lib/marketing/sheets";
import { MarketingView } from "@/app/(app)/marketing/view";

function rangeDays(value: string | undefined): RangeDays {
  if (value === "7" || value === "90") return Number(value) as RangeDays;
  return 30;
}

function channelOf(value: string | undefined): Channel {
  if (value === "residential" || value === "commercial") return value;
  return "all";
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const days = rangeDays(params.range);
  const channel = channelOf(params.channel);
  const { start, end } = rangeFor(days);
  const today = end;
  const [sheets, leads] = await Promise.all([
    loadMarketingSheets(),
    prisma.lead.findMany({
      select: {
        status: true,
        source: true,
        createdAt: true,
        outcomeDate: true,
        followUpDate: true,
        finalJobValue: true,
        quoteJobType: true,
        pricingModel: true,
        frequency: true,
        frequencyDetail: true,
        customVisitsPerYear: true,
        quoteValue: true,
        hourlyRate: true,
        estimatedHours: true,
        estimatedWorkers: true,
        recurringPricingModel: true,
        recurringFrequency: true,
        recurringFrequencyDetail: true,
        recurringCustomVisitsPerYear: true,
        recurringQuoteValue: true,
        recurringHourlyRate: true,
        recurringEstimatedHours: true,
        recurringEstimatedWorkers: true,
      },
    }),
  ]);
  const numbers = sheets.grids
    ? buildMarketingNumbers(sheets.grids, { start, end, today, channel })
    : unavailableNumbers(sheets.feeds ?? []);
  const pipeline = summarisePipeline(leads, start, end);

  return (
    <MarketingView
      days={days}
      channel={channel}
      start={start}
      end={end}
      fetchedAt={sheets.fetchedAt}
      missing={sheets.missing}
      error={sheets.error}
      pipeline={pipeline}
      {...numbers}
    />
  );
}
