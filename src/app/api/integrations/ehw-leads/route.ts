import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  "https://ehwlandscapes.com",
  "https://www.ehwlandscapes.com",
]);
const HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
  "Cache-Control": "no-store",
};

function response(data: object, status: number, origin?: string) {
  return NextResponse.json(data, {
    status,
    headers: { ...HEADERS, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) },
  });
}

function approvedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

export async function OPTIONS(req: NextRequest) {
  const origin = approvedOrigin(req);
  if (!origin) return response({ error: "Forbidden" }, 403);
  return new Response(null, { status: 204, headers: { ...HEADERS, "Access-Control-Allow-Origin": origin } });
}

function getString(obj: Record<string, unknown>, key: string, max = 200): string {
  const value = obj[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function getFirst(obj: Record<string, unknown>, keys: string[], max = 200): string {
  for (const k of keys) { const v = getString(obj, k, max); if (v) return v; }
  return "";
}

async function verifyTurnstile(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token || token.length > 2048) return false; // Fail closed
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return false;
  const result = (await res.json()) as { success?: boolean; hostname?: string };
  return result.success === true &&
    (result.hostname === "ehwlandscapes.com" || result.hostname === "www.ehwlandscapes.com");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch] ?? ch);
}

// Called only for a newly created lead, not duplicate network retries.
async function notifyTeam(lead: { id: number; customerName: string; email: string; phone: string; workType: string; area: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_NOTIFICATION_FROM;
  const to = process.env.LEAD_NOTIFICATION_TO;
  if (!key || !from || !to) {
    console.warn("[ehw-leads] Email notifications are not configured.");
    return;
  }
  const body = [
    "A new enquiry has been saved in Netgreen.",
    "Netgreen lead #" + lead.id,
    "Name: " + lead.customerName,
    "Email: " + lead.email,
    "Phone: " + lead.phone,
    "Service: " + lead.workType,
    "Area: " + lead.area,
    "Open Netgreen to see all submitted details.",
  ].join("\n");
  const reply = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "New EHW enquiry - " + lead.workType, text: body }),
    signal: AbortSignal.timeout(8000),
  });
  if (!reply.ok) console.error("[ehw-leads] Email notification failed", reply.status);
}

// Public endpoint for EHW's static website; security does not depend on Origin
// alone. Turnstile validation is required server-side on every new request.
export async function POST(req: NextRequest) {
  const origin = approvedOrigin(req);
  if (!origin) return response({ accepted: false, error: "Origin not allowed" }, 403);
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json")) return response({ accepted: false, error: "Expected JSON" }, 415, origin);
  let raw: string;
  try { raw = await req.text(); } catch { return response({ accepted: false, error: "Unreadable request" }, 400, origin); }
  if (raw.length > 16000) return response({ accepted: false, error: "Too large" }, 413, origin);
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch { return response({ accepted: false, error: "Invalid JSON" }, 400, origin); }

  // Honeypot is a hidden field, never presented to human users.
  if (getString(body, "website", 500)) return response({ accepted: false, error: "Invalid request" }, 400, origin);

  const requestId = getString(body, "requestId", 50);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return response({ accepted: false, error: "Invalid submission ID" }, 422, origin);
  }

  // A duplicate retry should not require reusing a single-use Turnstile token.
  // However, do not reveal an existing lead by ID without a valid challenge.
  const token = getFirst(body, ["turnstileToken", "cf-turnstile-response"], 2048);
  let verified = false;
  try {
    verified = await verifyTurnstile(token, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
  } catch (err) {
    console.error("[ehw-leads] Turnstile verification unavailable", err);
    return response({ accepted: false, error: "Verification temporarily unavailable" }, 503, origin);
  }
  if (!verified) return response({ accepted: false, error: "Please complete verification" }, 403, origin);

  const customerName = getFirst(body, ["name", "customerName"], 200);
  const email = getString(body, "email", 254);
  const phone = getString(body, "phone", 100);
  const message = getFirst(body, ["message", "requirements"], 4000);
  const area = getFirst(body, ["location", "property_location", "area"], 240);
  if (customerName.length < 2 || (!email && !phone) || (email && !/^\S+@\S+\.\S+$/.test(email)) || !message) {
    return response({ accepted: false, error: "Please complete the contact details and enquiry" }, 422, origin);
  }
  const service = getFirst(body, ["service", "site_type", "service_type", "enquiry"], 100).toLowerCase();
  const workType = service.includes("fenc") ? "Fencing"
    : service.includes("hedge") ? "Hedge cutting"
    : service.includes("commercial") || service.includes("management") || service.includes("block")
      || service.includes("estate") || service.includes("care-home") ? "Commercial grounds maintenance"
    : service.includes("garden") ? "Garden maintenance" : "Other";
  const organisation = getString(body, "organisation", 200);
  const utmSource = getString(body, "utm_source", 80).replace(/[^a-z0-9 _-]/gi, "");
  const utmCampaign = getString(body, "utm_campaign", 100).replace(/[^a-z0-9 _-]/gi, "");
  const detail = ["Netgreen web enquiry",utmSource && "src=" + utmSource,utmCampaign && "campaign=" + utmCampaign].filter(Boolean).join("; ");
  const externalRef = "ehw-web:" + createHash("sha256").update(requestId).digest("hex");
  const existed = await prisma.lead.findUnique({ where: { externalRef }, select: { id: true } });
  if (existed) return response({ accepted: true, id: existed.id, duplicate: true }, 200, origin);

  let lead;
  try {
    lead = await prisma.lead.create({
      data: {
        externalRef, customerName, email, phone, area,
        description: (organisation ? "Organisation: " + organisation + "\n" : "") + message,
        workType, source: utmSource === "google" ? "Google" : "Website", sourceDetail: detail,
      },
      select: { id: true, customerName: true, email: true, phone: true, workType: true, area: true },
    });
  } catch (err) {
    // Prisma P2002: another identical request created the lead concurrently.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return response({ accepted: true, duplicate: true }, 200, origin);
    }
    console.error("[ehw-leads] Could not save enquiry", err);
    return response({ accepted: false, error: "Unable to receive enquiry" }, 503, origin);
  }

  try { await notifyTeam(lead); } catch (err) {
    console.error("[ehw-leads] Notification exception", err);
  }
  return response({ accepted: true, id: lead.id }, 201, origin);
}
