import { unstable_cache } from "next/cache";
import type { Cell } from "@/lib/marketing/parse";
import { failedFeeds, type FeedHealth, type SheetGrids } from "@/lib/marketing/report";

const SHEET_RANGES = [
  "'Google Ads Daily'!A1:J2000",
  "'GA4 Daily'!A1:F2000",
  "'GA4 Events Daily'!A1:F4000",
  "'Google Profile Daily'!A1:F2000",
] as const;

export type SheetLoad = {
  fetchedAt: string;
  missing: string[];
  error: string | null;
  grids: SheetGrids | null;
  feeds: FeedHealth[] | null;
};

const REQUIRED_ENV = [
  "EHW_MARKETING_SHEET_ID",
  "GOOGLE_SHEETS_CLIENT_EMAIL",
  "GOOGLE_SHEETS_PRIVATE_KEY",
] as const;

function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

function privateKey(): string {
  return (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function accessToken(email: string, key: string): Promise<string> {
  const { createSign } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64url(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ),
  ].join(".");
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status}).`);
  }
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google token response had no access token.");
  return body.access_token;
}

async function readSpreadsheet(): Promise<SheetLoad> {
  const missing = missingEnv();
  const fetchedAt = new Date().toISOString();
  if (missing.length > 0) {
    return {
      fetchedAt,
      missing,
      error: "Google Sheets credentials are not configured.",
      grids: null,
      feeds: failedFeeds("Google Sheets credentials are not configured."),
    };
  }

  try {
    const token = await accessToken(
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL!.trim(),
      privateKey()
    );
    const sheetId = process.env.EHW_MARKETING_SHEET_ID!.trim();
    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet`
    );
    for (const range of SHEET_RANGES) url.searchParams.append("ranges", range);
    url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
    url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 403 || response.status === 404) {
      return {
        fetchedAt,
        missing: [],
        error: `Google Sheets refused access (${response.status}). Share the spreadsheet with the service account as Viewer.`,
        grids: null,
        feeds: failedFeeds(`Google Sheets refused access (${response.status}).`),
      };
    }
    if (!response.ok) {
      return {
        fetchedAt,
        missing: [],
        error: `Google Sheets request failed (${response.status}).`,
        grids: null,
        feeds: failedFeeds(`Google Sheets request failed (${response.status}).`),
      };
    }
    const body = (await response.json()) as {
      valueRanges?: Array<{ values?: Cell[][] }>;
    };
    const values = body.valueRanges ?? [];
    return {
      fetchedAt,
      missing: [],
      error: null,
      grids: {
        ads: values[0]?.values ?? [],
        ga4: values[1]?.values ?? [],
        events: values[2]?.values ?? [],
        profile: values[3]?.values ?? [],
      },
      feeds: null,
    };
  } catch {
    return {
      fetchedAt,
      missing: [],
      error: "Google Sheets could not be reached.",
      grids: null,
      feeds: failedFeeds("Google Sheets could not be reached."),
    };
  }
}

export const loadMarketingSheets = unstable_cache(readSpreadsheet, ["ehw-marketing-sheets"], {
  revalidate: 600,
  tags: ["marketing-sheets"],
});

export { REQUIRED_ENV };
