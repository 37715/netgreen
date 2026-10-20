import Link from "next/link";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
function gbp(v:number){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(v);}
export default async function MarketingPage() {
  const since=new Date(); since.setUTCDate(since.getUTCDate()-30);
  const [rows,leads]=await Promise.all([
    prisma.marketingDaily.findMany({where:{date:{gte:since}},orderBy:[{date:"desc"},{campaign:"asc"}]}),
    prisma.lead.findMany({where:{createdAt:{gte:since}},select:{id:true,status:true,source:true,finalJobValue:true,quoteValue:true,createdAt:true}}),
  ]);
  const ad=rows.filter(r=>r.source==="google_ads");
  const ga=rows.filter(r=>r.source==="ga4");
  const profile=rows.filter(r=>r.source==="google_business_profile");
  const sum=(items:typeof rows,field:"spend"|"clicks"|"impressions"|"conversions"|"sessions"|"formLeads"|"phoneClicks"|"profileCalls"|"websiteClicks")=>items.reduce((total,r)=>total+r[field],0);
  const spend=sum(ad,"spend"), conversions=sum(ad,"conversions"),won=leads.filter(l=>l.status==="WON"),wonValue=won.reduce((s,l)=>s+(l.finalJobValue??0),0);
  return <div className="space-y-6">
    <div><p className="eyebrow">Netgreen · acquisition</p><h1 className="font-display text-3xl font-extrabold text-brand-900">Marketing & leads</h1><p className="mt-1 text-sm text-stone-500">Last 30 days · automated daily aggregates when connected</p></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Google Ads spend" value={gbp(spend)}/>
      <Stat label="Google Ads conversions" value={String(conversions)}/>
      <Stat label="Cost per Ads conversion" value={conversions>0?gbp(spend/conversions):"—"}/>
      <Stat label="Won leads (all sources)" value={String(won.length)}/>
      <Stat label="GA4 sessions" value={String(sum(ga,"sessions"))}/>
      <Stat label="GA4 form events" value={String(sum(ga,"formLeads"))}/>
      <Stat label="GBP call clicks" value={String(sum(profile,"profileCalls"))}/>
      <Stat label="Won lead value (all sources)" value={gbp(wonValue)}/>
    </div>
    <div className="card p-5">
      <h2 className="font-display font-bold text-brand-900">Campaign performance</h2>
      <p className="mt-1 text-xs text-stone-500">Google Ads conversions are attributed ad events, not necessarily distinct qualified enquiries. Won leads and revenue above include every source and must not be treated as advertising return without lead-level attribution.</p>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-stone-500"><th className="p-2">Campaign</th><th className="p-2 text-right">Spend</th><th className="p-2 text-right">Clicks</th><th className="p-2 text-right">Conversions</th><th className="p-2 text-right">Cost / conv.</th></tr></thead><tbody>{Array.from(new Set(ad.map(r=>r.campaign))).map(name=>{const c=ad.filter(r=>r.campaign===name);const s=sum(c,"spend"), conv=sum(c,"conversions");return <tr key={name} className="border-b border-stone-100"><td className="p-2">{name||"Unspecified"}</td><td className="p-2 text-right">{gbp(s)}</td><td className="p-2 text-right">{sum(c,"clicks")}</td><td className="p-2 text-right">{conv}</td><td className="p-2 text-right">{conv?gbp(s/conv):"—"}</td></tr>})}</tbody></table></div>
      {ad.length===0&&<p className="mt-3 text-sm text-stone-500">No imported Google Ads metrics yet. Finish the ETL configuration before relying on this dashboard.</p>}
    </div>
    <div className="card p-5"><div className="flex items-center justify-between"><h2 className="font-display font-bold text-brand-900">Lead pipeline</h2><Link className="text-sm font-semibold text-brand-700" href="/leads">Open all leads →</Link></div><p className="mt-2 text-sm text-stone-500">{leads.length} leads entered in the last 30 days. Qualified status and won-job figures are updated in Netgreen.</p></div>
    <p className="text-xs text-stone-500">Last data refresh: {rows.length?rows.reduce((a,b)=>a.updatedAt>b.updatedAt?a:b).updatedAt.toLocaleString("en-GB",{timeZone:"Europe/London"}):"No imports yet"}. Costs are ad platform costs only, not job profit.</p>
  </div>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="card p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 font-display text-xl font-extrabold text-brand-900">{value}</p></div>}
