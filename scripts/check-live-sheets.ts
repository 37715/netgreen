import { createSign } from "node:crypto";
import type { Cell } from "../src/lib/marketing/parse";
import { parseAds, parseEvents, parseGa4, parseProfile } from "../src/lib/marketing/parse";
import { buildMarketingNumbers, rangeFor } from "../src/lib/marketing/report";

const required = ["EHW_MARKETING_SHEET_ID", "GOOGLE_SHEETS_CLIENT_EMAIL", "GOOGLE_SHEETS_PRIVATE_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.log("missing", missing.join(","));
  process.exit(1);
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64url(
      JSON.stringify({
        iss: process.env.GOOGLE_SHEETS_CLIENT_EMAIL!.trim(),
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ),
  ].join(".");
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  console.log("token_status", tokenResponse.status);
  if (!tokenResponse.ok) process.exit(1);
  const token = ((await tokenResponse.json()) as { access_token?: string }).access_token;
  if (!token) {
    console.log("token_missing");
    process.exit(1);
  }

  const ranges = [
    "'Google Ads Daily'!A1:J2000",
    "'GA4 Daily'!A1:F2000",
    "'GA4 Events Daily'!A1:F4000",
    "'Google Profile Daily'!A1:F2000",
  ];
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.EHW_MARKETING_SHEET_ID!.trim())}/values:batchGet`
  );
  for (const range of ranges) url.searchParams.append("ranges", range);
  url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  console.log("sheets_status", response.status);
  if (!response.ok) process.exit(1);

  const body = (await response.json()) as { valueRanges?: Array<{ values?: Cell[][] }> };
  const grids = {
    ads: body.valueRanges?.[0]?.values ?? [],
    ga4: body.valueRanges?.[1]?.values ?? [],
    events: body.valueRanges?.[2]?.values ?? [],
    profile: body.valueRanges?.[3]?.values ?? [],
  };
  const headers = {
    ads: grids.ads[0] ?? [],
    ga4: grids.ga4[0] ?? [],
    events: grids.events[0] ?? [],
    profile: grids.profile[0] ?? [],
  };
  console.log("headers", JSON.stringify(headers));

  const parsed = {
    ads: parseAds(grids.ads),
    ga4: parseGa4(grids.ga4),
    events: parseEvents(grids.events),
    profile: parseProfile(grids.profile),
  };
  for (const [name, result] of Object.entries(parsed)) {
    if (!result.ok) {
      console.log(name, "parse_error", result.error);
      continue;
    }
    const dates = result.rows.map((row) => row.date).sort();
    console.log(name, "rows", result.rows.length, "from", dates[0] ?? "-", "to", dates.at(-1) ?? "-");
  }

  const { start, end } = rangeFor(30);
  const numbers = buildMarketingNumbers(grids, { start, end, today: end, channel: "all" });
  const show = (label: string, metric: { kind: string; value: number | null }) => {
    console.log(label, metric.kind, metric.value);
  };
  show("spend", numbers.spend);
  show("impressions", numbers.impressions);
  show("clicks", numbers.clicks);
  show("ads_conversions", numbers.adsConversions);
  show("sessions", numbers.sessions);
  show("generate_lead", numbers.generateLead);
  show("click_to_call", numbers.clickToCall);
  show("profile_calls", numbers.profileCalls);
  show("profile_impressions", numbers.profileImpressions);
  show("profile_website_clicks", numbers.profileWebsiteClicks);
  for (const feed of numbers.feeds) {
    console.log("feed", feed.id, feed.status, feed.lastDate, feed.rowCount);
  }
}

main().catch((error: unknown) => {
  console.log("check_failed", error instanceof Error ? error.name : "error");
  process.exit(1);
});
