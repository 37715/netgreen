import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { AD_BUDGET_SETTINGS, type AdsPoint, type CampaignRow, type Channel, type FeedHealth, type Metric, type ProfilePoint, type RangeDays } from "@/lib/marketing/report";
import type { PipelineSummary } from "@/lib/marketing/pipeline";
import { leadStatusLabels, LEAD_STATUSES } from "@/lib/leads";
import { refreshMarketing } from "@/app/(app)/marketing/actions";

const CHANNELS: Channel[] = ["all", "residential", "commercial"];
const RANGES: RangeDays[] = [7, 30, 90];
const LINE_COLOURS = ["#114f30", "#639312", "#515a4b"];

function formatCount(metric: Metric): string {
  if (metric.kind === "awaiting") return "Awaiting data";
  if (metric.kind === "error") return "Unavailable";
  if (metric.kind === "empty-range" || metric.value == null) return "No rows in range";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(metric.value);
}

function formatGbp(metric: Metric): string {
  if (metric.kind === "awaiting") return "Awaiting data";
  if (metric.kind === "error") return "Unavailable";
  if (metric.kind === "empty-range" || metric.value == null) return "No rows in range";
  return formatMoney(metric.value);
}

function formatRatio(value: number | null, style: "money" | "percent"): string {
  if (value == null) return "—";
  if (style === "money") return formatMoney(value);
  return `${(value * 100).toFixed(1)}%`;
}

function hrefFor(days: RangeDays, channel: Channel): string {
  const params = new URLSearchParams();
  if (days !== 30) params.set("range", String(days));
  if (channel !== "all") params.set("channel", channel);
  const query = params.toString();
  return query ? `/marketing?${query}` : "/marketing";
}

function statusLabel(status: FeedHealth["status"]): string {
  if (status === "reporting") return "Reporting";
  if (status === "stale") return "Stale";
  if (status === "awaiting") return "Awaiting data";
  return "Error";
}

export function MarketingView({
  days,
  channel,
  start,
  end,
  fetchedAt,
  missing,
  error,
  feeds,
  spend,
  impressions,
  clicks,
  adsConversions,
  ctr,
  cpc,
  cpa,
  sessions,
  generateLead,
  clickToCall,
  profileImpressions,
  profileCalls,
  profileWebsiteClicks,
  campaigns,
  adsSeries,
  profileSeries,
  pipeline,
}: {
  days: RangeDays;
  channel: Channel;
  start: string;
  end: string;
  fetchedAt: string;
  missing: string[];
  error: string | null;
  feeds: FeedHealth[];
  spend: Metric;
  impressions: Metric;
  clicks: Metric;
  adsConversions: Metric;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  sessions: Metric;
  generateLead: Metric;
  clickToCall: Metric;
  profileImpressions: Metric;
  profileCalls: Metric;
  profileWebsiteClicks: Metric;
  campaigns: CampaignRow[];
  adsSeries: AdsPoint[] | null;
  profileSeries: ProfilePoint[] | null;
  pipeline: PipelineSummary;
}) {
  const fetched = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(fetchedAt));

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hidden print:block text-xs font-semibold uppercase tracking-wide text-stone-500">
            EHW Landscapes
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-900">Marketing</h1>
          <p className="mt-1 text-sm text-stone-500">
            {start} to {end}
            <span className="print:inline hidden"> · fetched {fetched}</span>
          </p>
        </div>
        <div className="print:hidden flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-stone-200 bg-white p-1">
            {RANGES.map((option) => (
              <Link
                key={option}
                href={hrefFor(option, channel)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  option === days ? "bg-brand-700 text-white" : "text-stone-600"
                }`}
              >
                {option} days
              </Link>
            ))}
          </div>
          <div className="flex rounded-xl border border-stone-200 bg-white p-1">
            {CHANNELS.map((option) => (
              <Link
                key={option}
                href={hrefFor(days, option)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                  option === channel ? "bg-brand-700 text-white" : "text-stone-600"
                }`}
              >
                {option}
              </Link>
            ))}
          </div>
          <form action={refreshMarketing}>
            <button type="submit" className="btn-secondary">
              Refresh
            </button>
          </form>
        </div>
      </header>

      {missing.length > 0 && (
        <section className="card mb-4 p-4 text-sm text-stone-700">
          <h2 className="font-display text-base font-bold text-brand-900">Sheets not connected</h2>
          <p className="mt-1">Set these server environment variables, then refresh:</p>
          <ul className="mt-2 list-disc pl-5 font-mono text-xs">
            {missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}
      {error && missing.length === 0 && (
        <section className="card mb-4 border-clay-100 p-4 text-sm text-clay-600">{error}</section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Ad spend" value={formatGbp(spend)} hint="Recorded Google Ads cost" />
        <Kpi label="Impressions" value={formatCount(impressions)} />
        <Kpi label="Clicks" value={formatCount(clicks)} hint={ctr == null ? undefined : `${formatRatio(ctr, "percent")} CTR`} />
        <Kpi label="Avg. CPC" value={cpc == null ? (spend.kind === "value" ? "—" : formatGbp(spend)) : formatMoney(cpc)} />
        <Kpi label="Ads conversions" value={formatCount(adsConversions)} hint={cpa == null ? "Not Netgreen jobs won" : `${formatMoney(cpa)} each`} />
        <Kpi label="Sessions" value={formatCount(sessions)} hint="GA4" />
        <Kpi label="Form leads" value={formatCount(generateLead)} hint="GA4 generate_lead" />
        <Kpi label="Phone-link clicks" value={formatCount(clickToCall)} hint="Website taps, not answered calls" />
        <Kpi label="Profile calls" value={formatCount(profileCalls)} hint="Google call-button clicks" />
        <Kpi label="Profile views" value={formatCount(profileImpressions)} hint="Google Business Profile" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <h2 className="font-display text-base font-bold text-brand-900">Daily ad performance</h2>
          {adsSeries == null ? (
            <p className="mt-6 text-sm text-stone-500">Awaiting data</p>
          ) : adsSeries.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">No rows in range</p>
          ) : (
            <SpendChart points={adsSeries} />
          )}
        </div>
        <div className="card p-4 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-brand-900">Profile visibility</h2>
          {profileSeries == null ? (
            <p className="mt-6 text-sm text-stone-500">Awaiting data</p>
          ) : profileSeries.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">No rows in range</p>
          ) : (
            <>
              <ProfileChart points={profileSeries} />
              <p className="mt-2 text-xs text-stone-500">
                Website clicks from the profile: {formatCount(profileWebsiteClicks)}. These are not Google Ads conversions.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="card mt-4 overflow-x-auto">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
          <h2 className="font-display text-base font-bold text-brand-900">Campaigns</h2>
          <p className="text-xs text-stone-500">Daily budget is the campaign setting, not measured spend.</p>
        </div>
        <table className="mt-2 w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Campaign</th>
              <th className="px-3 py-2 font-semibold">Spend</th>
              <th className="px-3 py-2 font-semibold">Clicks</th>
              <th className="px-3 py-2 font-semibold">Conv.</th>
              <th className="px-3 py-2 font-semibold">CTR</th>
              <th className="px-3 py-2 font-semibold">CPC</th>
              <th className="px-3 py-2 font-semibold">CPA</th>
              <th className="px-4 py-2 font-semibold">Daily budget</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-stone-500" colSpan={8}>
                  {spend.kind === "error" ? "Unavailable" : "Awaiting data"}
                </td>
              </tr>
            ) : (
              campaigns.map((row) => (
                <tr key={row.name} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-800">{row.name}</td>
                  <td className="px-3 py-3 tabular-nums">{formatMoney(row.spend)}</td>
                  <td className="px-3 py-3 tabular-nums">{row.clicks}</td>
                  <td className="px-3 py-3 tabular-nums">{row.conversions}</td>
                  <td className="px-3 py-3 tabular-nums">{formatRatio(row.ctr, "percent")}</td>
                  <td className="px-3 py-3 tabular-nums">{formatRatio(row.cpc, "money")}</td>
                  <td className="px-3 py-3 tabular-nums">{formatRatio(row.cpa, "money")}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.dailyBudget == null ? "—" : `${formatMoney(row.dailyBudget)}/day`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
            {AD_BUDGET_SETTINGS.map((item) => (
              <div key={item.channel}>
                {item.name}: {formatMoney(item.dailyGbp)}/day budget setting
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-bold text-brand-900">Lead pipeline</h2>
            <Link href="/leads" className="print:hidden text-sm font-semibold text-brand-700">
              Open leads
            </Link>
          </div>
          <p className="mt-1 text-xs text-stone-500">Current Netgreen records. Not attributed to an ad campaign.</p>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {LEAD_STATUSES.map((status) => (
              <div key={status} className="rounded-xl bg-stone-50 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  {leadStatusLabels[status]}
                </dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums text-stone-900">
                  {pipeline.stages[status]}
                </dd>
              </div>
            ))}
          </dl>
          <dl className="mt-3 space-y-1 text-sm text-stone-700">
            <Row label="New in this period" value={String(pipeline.newInPeriod)} />
            <Row label="Open leads" value={String(pipeline.open)} />
            <Row label="Quoted, one-off" value={formatMoney(pipeline.oneOffQuotedValue)} />
            <Row label="Quoted, monthly" value={formatMoney(pipeline.recurringMonthlyValue)} />
            <Row label="Overdue follow-ups" value={String(pipeline.overdueFollowUps)} />
            <Row label="Jobs won in this period" value={String(pipeline.wonInPeriod)} />
            <Row label="Known won value" value={formatMoney(pipeline.knownWonValue)} />
          </dl>
          {pipeline.winsWithoutValue > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              {pipeline.winsWithoutValue} won {pipeline.winsWithoutValue === 1 ? "lead has" : "leads have"} no final job value.
            </p>
          )}
        </div>
        <div className="card p-4">
          <h2 className="font-display text-base font-bold text-brand-900">Enquiries by source</h2>
          <p className="mt-1 text-xs text-stone-500">Recorded in Netgreen during this period, from every source.</p>
          {pipeline.sources.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No enquiries in this period.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100 text-sm">
              {pipeline.sources.map((source) => (
                <li key={source.source} className="flex justify-between py-2">
                  <span>{source.source}</span>
                  <span className="tabular-nums font-semibold">{source.count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-stone-600">
            Cost per acquired customer is not available until lead-to-campaign attribution is verified.
          </p>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="font-display text-base font-bold text-brand-900">Data freshness</h2>
        <p className="mt-1 text-xs text-stone-500">
          Windsor exports daily around 05:00–06:00 UTC. This view was fetched {fetched}. Sheet reads are cached for about 10 minutes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 font-semibold">Source</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Latest date</th>
                <th className="py-2 font-semibold">Rows</th>
                <th className="py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((feed) => (
                <tr key={feed.id} className="border-t border-stone-100">
                  <td className="py-2">{feed.label}</td>
                  <td className="py-2">{statusLabel(feed.status)}</td>
                  <td className="py-2 tabular-nums">{feed.lastDate ?? "—"}</td>
                  <td className="py-2 tabular-nums">{feed.rowCount}</td>
                  <td className="py-2 text-stone-500">{feed.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const waiting = value === "Awaiting data" || value === "Unavailable" || value === "No rows in range";
  return (
    <div className="stat-card">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1.5 text-xl font-extrabold tabular-nums ${waiting ? "text-stone-400" : "text-stone-900"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-stone-400">{hint}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="tabular-nums font-semibold">{value}</dd>
    </div>
  );
}

function SpendChart({ points }: { points: AdsPoint[] }) {
  const campaigns = [...new Set(points.map((point) => point.campaign))];
  const dates = [...new Set(points.map((point) => point.date))].sort();
  const width = 640;
  const height = 180;
  const pad = 24;
  const max = Math.max(...points.map((point) => point.spend), 1);
  const x = (index: number) =>
    dates.length === 1 ? width / 2 : pad + (index / (dates.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Daily ad spend">
        {campaigns.map((campaign, index) => {
          const series = dates.map((date) => points.find((point) => point.date === date && point.campaign === campaign)?.spend ?? 0);
          const path = series.map((value, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x(pointIndex)} ${y(value)}`).join(" ");
          return <path key={campaign} d={path} fill="none" stroke={LINE_COLOURS[index % LINE_COLOURS.length]} strokeWidth="2" />;
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
        {campaigns.map((campaign, index) => (
          <li key={campaign} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: LINE_COLOURS[index % LINE_COLOURS.length] }} />
            {campaign}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileChart({ points }: { points: ProfilePoint[] }) {
  const max = Math.max(...points.map((point) => point.impressions), 1);
  return (
    <div className="mt-4 flex h-28 items-end gap-1">
      {points.map((point) => (
        <div
          key={point.date}
          title={`${point.date}: ${point.impressions} views, ${point.callClicks} call clicks`}
          className="min-w-0 flex-1 rounded-sm bg-brand-700"
          style={{ height: `${Math.max(4, (point.impressions / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
