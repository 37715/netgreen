import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Metrics = Awaited<ReturnType<typeof prisma.marketingDaily.findMany>>;
type Metric = Metrics[number];
type MetricField = "spend"|"impressions"|"clicks"|"conversions"|"sessions"|"formLeads"|"phoneClicks"|"profileCalls"|"websiteClicks";

const gbp = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(value);
const integer = (value: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
const total = (rows: Metrics, key: MetricField) => rows.reduce((sum, row) => sum + row[key], 0);
const sourceName = (source: string) => source === "google_ads" ? "Google Ads" : source === "ga4" ? "Google Analytics" : source === "google_business_profile" ? "Google Business Profile" : source;

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = rawDays === "7" ? 7 : rawDays === "90" ? 90 : 30;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days + 1);
  const [rows, leads] = await Promise.all([
    prisma.marketingDaily.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" } }),
    prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, status: true, source: true, finalJobValue: true, quoteValue: true, followUpDate: true },
    }),
  ]);
  const ads = rows.filter(r => r.source === "google_ads");
  const analytics = rows.filter(r => r.source === "ga4");
  const profile = rows.filter(r => r.source === "google_business_profile");
  const spend = total(ads, "spend"), adsConversions = total(ads, "conversions");
  const won = leads.filter(l => l.status === "WON");
  const quoted = leads.filter(l => l.status === "QUOTED");
  const now = new Date();
  const due = leads.filter(l => l.followUpDate && l.followUpDate <= now && l.status !== "WON" && l.status !== "LOST").length;
  const knownWonValue = won.filter(l => l.finalJobValue != null).reduce((s, l) => s + (l.finalJobValue ?? 0), 0);
  const adsCampaigns = [...new Set(ads.map(r => r.campaign))].filter(Boolean);
  const hasAds = ads.length > 0, hasAnalytics = analytics.length > 0, hasProfile = profile.length > 0;
  const statuses = [
    { name: "Google Ads", active: hasAds, stamp: latest(ads) },
    { name: "Google Analytics", active: hasAnalytics, stamp: latest(analytics) },
    { name: "Google Business Profile", active: hasProfile, stamp: latest(profile) },
    { name: "Netgreen lead pipeline", active: true, stamp: "Connected" },
  ];
  const lastSync = rows.length ? rows.reduce((latest, r) => r.updatedAt > latest ? r.updatedAt : latest, rows[0].updatedAt) : null;
  const chartRows = hasProfile ? profile : hasAds ? ads : analytics;
  const chartField: MetricField = hasProfile ? "impressions" : hasAds ? "clicks" : "sessions";
  const chartName = hasProfile ? "Google Business Profile impressions" : hasAds ? "Google Ads clicks" : "Website sessions";

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Business intelligence / Marketing</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">Marketing</h1>
          <p className="mt-2 text-sm text-stone-500">Advertising, website enquiries and sales pipeline.</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">
          {lastSync ? "Data updated " + lastSync.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No advertising data imported yet"}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6 text-white sm:p-8">
          <div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border border-white/15 shadow-[0_0_0_35px_rgba(255,255,255,0.025),0_0_0_85px_rgba(255,255,255,0.02)]" aria-hidden="true" />
          <div className="relative">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-200">Marketing investment</p>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Campaign budgets</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-200">Configured Search budgets for residential services and commercial grounds maintenance. Actual campaign results appear below when available.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-lg bg-lime-400 px-3 py-2 text-brand-900">£750 / month planned</span>
              <span className="rounded-lg border border-brand-500 px-3 py-2 text-brand-100">£525 residential</span>
              <span className="rounded-lg border border-brand-500 px-3 py-2 text-brand-100">£225 commercial</span>
            </div>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-display text-base font-extrabold text-brand-900">Data connection health</h2>
          <p className="mt-1 text-xs text-stone-500">No missing values are assumed to be zero.</p>
          <div className="mt-4 divide-y divide-stone-100">
            {statuses.map(s => <div key={s.name} className="flex items-center justify-between gap-3 py-3 text-xs">
              <span className="font-medium text-stone-700">{s.name}</span>
              <span className={s.active ? "font-bold text-brand-600" : "font-bold text-clay-600"}>{s.active ? "● Reporting" : "◐ Awaiting sync"}</span>
            </div>)}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        <div><p className="eyebrow">At a glance</p><h2 className="font-display text-lg font-extrabold text-brand-900">Business performance</h2></div>
        <div className="flex rounded-xl bg-stone-100 p-1">
          {[7, 30, 90].map(n => <Link key={n} href={`/marketing?days=${n}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${days === n ? "bg-white text-brand-800 shadow-sm" : "text-stone-500"}`}>{n} days</Link>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Google Ads spend" value={hasAds ? gbp(spend) : "Awaiting data"} note="Actual paid media costs" missing={!hasAds}/>
        <Stat label="Ads conversions" value={hasAds ? integer(adsConversions) : "Awaiting data"} note="Ad-attributed conversion actions" missing={!hasAds}/>
        <Stat label="Cost / Ads conversion" value={hasAds && adsConversions > 0 ? gbp(spend / adsConversions) : "—"} note="Not cost per won customer"/>
        <Stat label="New leads" value={integer(leads.length)} note="Logged in Netgreen, all sources"/>
        <Stat label="Google Profile impressions" value={hasProfile ? integer(total(profile, "impressions")) : "Awaiting data"} note="Search and Maps visibility" missing={!hasProfile}/>
        <Stat label="Profile call clicks" value={hasProfile ? integer(total(profile, "profileCalls")) : "Awaiting data"} note="Not necessarily answered calls" missing={!hasProfile}/>
        <Stat label="GA4 sessions" value={hasAnalytics ? integer(total(analytics, "sessions")) : "Awaiting data"} note="Website traffic, all sources" missing={!hasAnalytics}/>
        <Stat label="Known won-lead value" value={gbp(knownWonValue)} note={`${won.length} leads won (all sources)`}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="font-display text-base font-extrabold text-brand-900">Traffic & local visibility</h3><p className="mt-1 text-xs text-stone-500">{chartRows.length ? chartName + " · daily trend" : "Daily trend after the first analytics import"}</p></div>
            <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">{chartRows.length ? sourceName(chartRows[0].source) : "Waiting for feed"}</span>
          </div>
          {chartRows.length ? <TrendChart rows={chartRows} field={chartField} /> : <EmptyMessage message="No daily performance records yet. Once a data feed reaches Netgreen, the chart will populate automatically." />}
        </section>
        <section className="card p-5 sm:p-6">
          <h3 className="font-display text-base font-extrabold text-brand-900">Campaign budget allocation</h3>
          <p className="mt-1 text-xs text-stone-500">Planned Search advertising · £750/month</p>
          <BudgetLine name="Residential" detail="Hedge cutting · Garden fencing" amount="£525" percent={70} />
          <BudgetLine name="Commercial" detail="Estates · Managing agents · Sites" amount="£225" percent={30} />
          <div className="mt-5 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-500">{hasAds ? "Current campaign performance appears below. Budget allocation is a plan, not evidence of spend." : "Ads are configured, but no actual spend has been imported yet. The chart will never invent performance figures."}</div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="font-display text-base font-extrabold text-brand-900">From enquiry to booked job</h3><p className="mt-1 text-xs text-stone-500">Live Netgreen sales pipeline · selected period</p></div>
            <Link href="/leads" className="text-xs font-bold text-brand-700 hover:underline">Open pipeline →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stage label="New" value={leads.filter(l => l.status === "NEW").length}/>
            <Stage label="Quoted" value={quoted.length}/>
            <Stage label="Won" value={won.length}/>
            <Stage label="Follow-ups due" value={due} attention={due>0}/>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-stone-500">Figures include all sources. Revenue cannot be attributed to Google Ads until each lead is reliably linked to its originating campaign. A won lead is not automatically a completed or paid job.</p>
        </section>
        <section className="card p-5 sm:p-6">
          <h3 className="font-display text-base font-extrabold text-brand-900">Owner's next actions</h3>
          <p className="mt-1 text-xs text-stone-500">Focus on the decisions that move revenue.</p>
          <div className="mt-5 divide-y divide-stone-100">
            <ActionLine name="Follow up open enquiries" count={due} />
            <ActionLine name="Open quotes awaiting a decision" count={quoted.length} />
            <ActionLine name="Monitor ad search terms" count={null} />
            <ActionLine name="Reconcile jobs against ad sources" count={null} />
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="p-5 sm:p-6"><h3 className="font-display text-base font-extrabold text-brand-900">Advertising campaign performance</h3><p className="mt-1 text-xs text-stone-500">Actual platform metrics only. No estimated return on ad spend.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm"><thead><tr className="border-y border-stone-100 bg-stone-50 text-left text-xs text-stone-500"><th className="px-5 py-3">Campaign</th><th className="px-5 py-3 text-right">Spend</th><th className="px-5 py-3 text-right">Clicks</th><th className="px-5 py-3 text-right">Conversions</th><th className="px-5 py-3 text-right">Cost / conversion</th></tr></thead>
          <tbody>{adsCampaigns.map(campaign => {
            const group = ads.filter(r => r.campaign === campaign);
            const groupSpend = total(group, "spend"), groupConversions = total(group, "conversions");
            return <tr key={campaign} className="border-b border-stone-100 last:border-0"><td className="px-5 py-4 font-semibold text-brand-900">{campaign}</td><td className="px-5 py-4 text-right">{gbp(groupSpend)}</td><td className="px-5 py-4 text-right">{integer(total(group, "clicks"))}</td><td className="px-5 py-4 text-right">{integer(groupConversions)}</td><td className="px-5 py-4 text-right">{groupConversions ? gbp(groupSpend / groupConversions) : "—"}</td></tr>;
          })}
          {!adsCampaigns.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-stone-500">No paid campaign performance records received yet.</td></tr>}
          </tbody></table>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
        <span>EHW Landscapes · Netgreen Owner Reporting</span>
        <span>Marketing costs are not job profit. Check data freshness before sharing figures.</span>
      </footer>
    </div>
  );
}

function latest(rows: Metrics) { if (!rows.length) return "No data"; return rows.reduce((d, r) => r.updatedAt > d ? r.updatedAt : d, rows[0].updatedAt).toISOString(); }

function Stat({ label, value, note, missing=false }: { label: string; value: string; note: string; missing?:boolean }) {
  return <div className="card min-h-32 p-4 sm:p-5">
    <div className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">{label}</div>
    <div className={`mt-3 font-display font-extrabold tracking-tight ${missing ? "text-lg text-clay-600" : "text-2xl text-brand-900 sm:text-3xl"}`}>{value}</div>
    <div className="mt-2 text-[11px] text-stone-400">{note}</div>
  </div>;
}

function BudgetLine({ name, detail, amount, percent }: {name:string;detail:string;amount:string;percent:number}) {
  return <div className="mt-6">
    <div className="flex items-start justify-between gap-2">
      <div><strong className="text-sm text-brand-900">{name}</strong><p className="mt-1 text-[11px] text-stone-500">{detail}</p></div>
      <div className="text-right"><strong className="text-sm text-brand-900">{amount}</strong><p className="mt-1 text-[11px] text-stone-400">{percent}%</p></div>
    </div>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-600" style={{ width: percent + "%" }}/></div>
  </div>;
}

function Stage({ label,value,attention=false }: {label:string;value:number;attention?:boolean}) {
  return <div className={`rounded-xl border px-3 py-4 ${attention ? "border-clay-100 bg-clay-100" : "border-stone-200 bg-stone-50"}`}>
    <div className="text-[10px] font-bold uppercase text-stone-500">{label}</div><div className="mt-2 font-display text-2xl font-extrabold text-brand-900">{integer(value)}</div>
  </div>;
}
function ActionLine({ name, count }: {name:string;count:number|null}) {
  return <div className="flex items-center justify-between gap-3 py-3 text-xs"><span className="text-stone-600">{name}</span><strong className="text-brand-700">{count===null ? "Review" : integer(count)}</strong></div>;
}
function EmptyMessage({message}:{message:string}) { return <div className="mt-6 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-xs leading-relaxed text-stone-500">{message}</div>; }

function TrendChart({ rows, field }: { rows: Metrics; field: MetricField }) {
  const dayMap = new Map<string, number>();
  for(const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + row[field]);
  }
  const series = [...dayMap.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(1,...series.map(x=>x[1]));
  const left=30,right=720,top=20,bottom=190;
  const pts = series.map((p,i)=>{
    const x=left + (series.length===1? (right-left)/2 : i*(right-left)/(series.length-1));
    const y=bottom - p[1]/max*(bottom-top);
    return [x,y] as const;
  });
  const path = pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const polygon = pts.length ? path+` L${pts[pts.length-1][0].toFixed(1)},${bottom} L${pts[0][0].toFixed(1)},${bottom} Z` : "";
  return <div className="mt-7">
    <svg viewBox="0 0 750 220" className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Historical daily visibility">
      <defs><linearGradient id="netgreen-marketing-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#27a26a" stopOpacity=".28"/><stop offset="1" stopColor="#27a26a" stopOpacity=".01"/></linearGradient></defs>
      {[0,.25,.5,.75,1].map(f=><g key={f}><line x1={left} x2={right} y1={bottom-(bottom-top)*f} y2={bottom-(bottom-top)*f} stroke="#e5ede7"/><text x={5} y={bottom-(bottom-top)*f+4} fill="#a0aaa0" fontSize="11">{Math.round(max*f)}</text></g>)}
      <path d={polygon} fill="url(#netgreen-marketing-area)"/>
      <path d={path} fill="none" stroke="#16795a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="#16795a" stroke="white" strokeWidth="1.5"><title>{series[i][0]+": "+series[i][1]}</title></circle>)}
    </svg>
    <div className="flex justify-between px-6 text-[11px] text-stone-400"><span>{series[0]?.[0]}</span><span>{series[series.length-1]?.[0]}</span></div>
  </div>;
}
