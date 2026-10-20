import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Use Formspree's Simple Webhook and verify its signed request. Keep the
// webhook signing secret only in the server environment, never in a URL.
export async function POST(request: NextRequest) {
  const secret = process.env.FORMSPREE_SIGNING_SECRET;
  const signature = request.headers.get("formspree-signature") ?? "";
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifySignature(secret, signature, raw)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
function verifySignature(secret: string, header: string, raw: string): boolean {
  const parts = Object.fromEntries(header.split(",").map(v => v.trim().split("=", 2)));
  const timestamp = Number(parts.t);
  const received = parts.v1 ?? "";
  if (!Number.isSafeInteger(timestamp) || !/^[0-9a-f]{64}$/i.test(received)) return false;
  // A day accommodates delayed webhook retries; duplicate payloads are upserted.
  if (Math.abs(Math.floor(Date.now()/1000) - timestamp) > 86400) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
