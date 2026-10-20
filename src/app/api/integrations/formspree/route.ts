import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Set FORMSPREE_WEBHOOK_SECRET in Vercel, then configure Formspree's
// server-side webhook URL as /api/integrations/formspree?token=SECRET.
// A URL token must never be used on the public website or logged.
export async function POST(request: NextRequest) {
  const secret = process.env.FORMSPREE_WEBHOOK_SECRET;
  const supplied = request.nextUrl.searchParams.get("token") ?? "";
  if (!secret || !supplied || !safeEqual(secret, supplied)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.text();
  if (raw.length > 200_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Different Formspree webhook delivery formats use either root fields
  // or a nested data object. Confirm actual format in staging first.
  const fields = (payload.submission && typeof payload.submission === "object" && !Array.isArray(payload.submission))
    ? payload.submission as Record<string, unknown>
    : (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data))
      ? payload.data as Record<string, unknown> : payload;
  const pick = (...keys: string[]) => keys.map(k => fields[k]).find(v => typeof v === "string") as string | undefined;
  const customerName = (pick("name", "customerName", "full_name") ?? "").trim().slice(0, 200);
  const email = (pick("email", "_replyto") ?? "").trim().slice(0, 254);
  const phone = (pick("phone", "telephone", "tel") ?? "").trim().slice(0, 100);
  if (!customerName || (!email && !phone)) return NextResponse.json({ error: "Missing contact" }, { status: 422 });
  // Canonical ID if provided, otherwise digest raw content. Dedupes webhook retries.
  const ref = "formspree:" + createHash("sha256").update(String(payload.id ?? payload.submission_id ?? raw)).digest("hex");
  const service = (pick("service_type", "service", "site_type") ?? "").toLowerCase();
  const workType = service.includes("fenc") ? "Fencing" : service.includes("hedge") ? "Hedge cutting" : service.includes("commercial") || service.includes("estate") || service.includes("care") ? "Garden maintenance" : "Other";
  const lead = await prisma.lead.upsert({
    where: { externalRef: ref },
    create: {
      externalRef: ref, customerName, email, phone,
      area: (pick("location", "property_location", "postcode", "area") ?? "").slice(0, 240),
      source: "Website", sourceDetail: "Formspree",
      workType,
      description: (pick("message", "requirements", "project_requirements") ?? "").slice(0, 4000),
    },
    update: {},
    select: { id: true },
  });
  return NextResponse.json({ accepted: true, leadId: lead.id });
}
function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
