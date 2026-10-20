import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// A scheduled ETL worker posts normalized daily aggregates to this endpoint.
// Do not place Windsor or Google API credentials on the browser.
type Metric = { date:string; source:string; campaign?:string; impressions?:number; clicks?:number; spend?:number; conversions?:number; sessions?:number; formLeads?:number; phoneClicks?:number; profileCalls?:number; websiteClicks?:number };
export async function POST(req: NextRequest) {
  const secret = process.env.MARKETING_INGEST_SECRET;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer /i,"") ?? "";
  if (!secret || !supplied || !equal(secret,supplied)) return NextResponse.json({error:"Unauthorized"},{status:401});
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  if (!body || typeof body !== "object" || !("rows" in body) || !Array.isArray(body.rows) || body.rows.length > 500) return NextResponse.json({error:"Expected <=500 rows"},{status:400});
  const rows = body.rows as Metric[];
  for(const m of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date ?? "") || !["google_ads","ga4","google_business_profile"].includes(m.source)) return NextResponse.json({error:"Invalid source or date"},{status:400});
    for(const k of ["spend","impressions","clicks","conversions","sessions","formLeads","phoneClicks","profileCalls","websiteClicks"] as const) {
      const v=m[k]; if(v!==undefined && (!Number.isFinite(v) || v<0)) return NextResponse.json({error:"Invalid metric "+k},{status:400});
    }
  }
  for(const m of rows) {
    const date = new Date(m.date+"T00:00:00.000Z");
    const campaign = (m.campaign ?? "").slice(0,200);
    const data = { impressions:Math.round(m.impressions??0), clicks:Math.round(m.clicks??0), spend:m.spend??0, conversions:m.conversions??0, sessions:Math.round(m.sessions??0), formLeads:Math.round(m.formLeads??0), phoneClicks:Math.round(m.phoneClicks??0), profileCalls:Math.round(m.profileCalls??0), websiteClicks:Math.round(m.websiteClicks??0) };
    await prisma.marketingDaily.upsert({where:{date_source_campaign:{date,source:m.source,campaign}},create:{date,source:m.source,campaign,...data},update:data});
  }
  return NextResponse.json({accepted:rows.length});
}
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
