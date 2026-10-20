# EHW Live Owner Dashboard — implementation brief (20 October 2026)

## Outcome

Deploy an authenticated, **live, data-connected** Netgreen business-owner dashboard
at `https://netgreen.vercel.app/marketing`. Reuse the existing Next.js + Prisma
application, its Google login and Lead tables. No standalone HTML file, mock
dashboard, sample KPI values, catchphrases, motivational or sales copy.

Design: existing Netgreen brand; executive reporting software, understated,
compact desktop table/graphs, responsive on phone, accessible colours.
Straight headings: "Marketing", "Ad spend", "Leads", "Calls", "Quotes",
"Jobs won", "Data freshness". 7/30/90-day date filter and campaign filter.
Print/share presentation view with timestamp and source labelling.

## Verified environment

- GitHub: `37715/netgreen`, production branch `master`.
- Hosting: Vercel project `netgreen`, public URL `https://netgreen.vercel.app`.
- Existing stack: Next.js 16.2.9, React 19, Prisma 6, PostgreSQL/Neon,
  NextAuth 5 Google login + `ALLOWED_EMAILS`.
- Auth in repo `src/auth.ts` and `src/middleware.ts` in production; the
  earlier experimental PR changes to `src/proxy.ts` must be tested.
- Existing sales lead table: `prisma/schema.prisma`, model `Lead`; existing
  `/leads`, actions in `src/app/actions/leads.ts`, status enum
  `NEW / CONTACTED / SITE_VISIT / QUOTED / WON / LOST`.
- The draft PR `https://github.com/37715/netgreen/pull/17` includes
  initial `/marketing` UI, Prisma MarketingDaily model, a metrics ingestion
  endpoint and direct-lead code. **DO NOT blindly merge PR #17**: it contains
  separate untested schema, auth routing and public API changes.
  Reuse/adapt just its dashboard UI if helpful, or implement on a fresh
  branch off current `master`. For first launch avoid new Prisma migrations:
  read marketing metrics from Google Sheets server-side, existing Lead data
  from Prisma server-side.
- Netgreen's `scripts/build.mjs` automatically performs `prisma db push`
  for production builds. Back up production before any schema-changing deploy,
  do not run `npm run db:reset` or `scripts/wipe.ts`.

## Authoritative Google Sheets source

- Spreadsheet name: EHW Marketing — Reporting & Export
- Spreadsheet ID: `1khz35W5KOv4bKWL9p3WdbGTCWR6FjAwYUhRFQbAE_E4`
- URL:
  `https://docs.google.com/spreadsheets/d/1khz35W5KOv4bKWL9p3WdbGTCWR6FjAwYUhRFQbAE_E4/edit`
- It is private; NEVER publish the sheet publicly or expose credentials in
  browser JS, API responses, logs, Git commits, client env vars or screenshots.

Windsor.ai writes four separate daily scheduled exports:

| Task | Connector | Sheet tab | UTC refresh |
|---|---|---|---|
| 54039 | google_ads account 830-165-7362 | Google Ads Daily | 05:00 |
| 54043 | googleanalytics4 property 559772721 | GA4 Daily | 05:30 |
| 54042 | googleanalytics4 property 559772721 | GA4 Events Daily | 05:45 |
| 54044 | google_my_business location 4211322254930035402 | Google Profile Daily | 06:00 |

The `Queries` sheet records task metadata. Do not use `Queries` as a
performance-data source. Other sheets `Overview` and `Lead Funnel Summary`
contain static headings and must not be treated as sales truth.

Windsor selected metric keys (not necessarily column order):
- **Google Ads Daily**: `date, campaign, clicks, spend, impressions, conversions`.
  A previously manually created header had columns
  `Date, Campaign, Impressions, Clicks, Spend GBP, Conversions, Cost / conversion`;
  it is NOT reliable until Windsor has written its own header and real data.
  Use actual headers after export, mapping case-insensitively by normalized name,
  not a positional hardcode. GBP account; verify numeric spend units.
- **GA4 Daily**: `date, sessions`. Existing manually seeded C/D headings
  `Form lead events` / `Phone-link clicks` are stale placeholders and
  should not be used; events come from the next sheet.
- **GA4 Events Daily**: `date, event_count, event_name`.
  Read `event_name` for `generate_lead`, `click_to_call`; other events
  may include `page_view`, `form_start`, `session_start`.
- **Google Profile Daily**: `date, impressions, call_clicks, website_clicks`.
  On 20 October, this was the only tab with actual exported rows: 28
  days from 2026-09-22 through 2026-10-19 (171 impressions, 2 call-button
  clicks, 6 website clicks). These are button clicks, not answered calls.
- As inspected, Google Ads, GA4 Daily and GA4 Events tabs were headings only.
  Do not invent spend=£0 or conversions=0 just because a sheet is empty.
  Display "Awaiting first import" with source health and last row date.
- Google Ads campaign names include:
  `EHW | Search | Residential | Oct 2026` and
  `EHW | Search | Commercial | Oct 2026`.
  Planned budgets £17.27/day residential, £7.40/day commercial
  (~£750/month using Google's 30.4-day average). These are *budget settings*,
  not actual recorded spend. Ads were enabled 20 October 2026.
- Google Analytics GA4 tag: `G-22CTG1LGFH`.
  `generate_lead` is a key event and Google Ads primary conversion;
  `click_to_call` is a website phone-link click, NOT a completed call.
  Ads "Calls from ads" conversion exists separately. Avoid double-counting.
- The Google Profile feed includes organic/local interactions, which MUST NOT
  be labelled as Google Ads conversions.

## Correct implementation of live Sheet access

Recommended fastest robust solution: **server-side Google Sheets API read** on
Netgreen + Next.js cache (e.g. 5 or 15 minute revalidate), no changes to public
marketing site, no schema migration. This reads Windsor's latest daily export
every time Netgreen refreshes its cache. It is "live connected" but not
second-by-second; Windsor data is refreshed daily.

1. Create a Google Cloud *service account*, enable Google Sheets API. Share
   this one private spreadsheet with its service-account email as **Viewer**.
2. Set encrypted/sensitive Vercel env vars:
   - `EHW_MARKETING_SHEET_ID=1khz35W5KOv4bKWL9p3WdbGTCWR6FjAwYUhRFQbAE_E4`
   - `GOOGLE_SHEETS_CLIENT_EMAIL` (service-account email)
   - `GOOGLE_SHEETS_PRIVATE_KEY` (private key, stored securely; handle
      escaped newlines via .replace(/\\n/g, "\n"))
   These are SERVER-ONLY (no `NEXT_PUBLIC_` prefixes).
   No API key should be committed in Git or shared in chat.
3. Use Google Sheets API `spreadsheets.values.batchGet` to read
   `'Google Ads Daily'!A1:J2000`, `'GA4 Daily'!A1:F2000`,
   `'GA4 Events Daily'!A1:F4000`,
   `'Google Profile Daily'!A1:F2000`.
4. Normalize keys from header rows, parse numeric strings safely
   (GBP, thousands separators, blanks), validate dates including
   YYYY-MM-DD and YYYYMMDD, handle trailing blank rows.
   Deduplicate by source + date + campaign or source + date + event_name.
   Do not sum pre-aggregated rates; calculate CTR=clicks/impressions,
   CPC=spend/clicks, CPA=spend/conversions where denominator >0.
   Normalize each feed to a single daily shape.
5. Provide explicit per-source freshness: newest available date, time of
   Sheet fetch, "No rows"/"Error"/"Reporting"/"Stale" status.
   If Google API fails, don't show zero metrics; show error with retry path.
6. Cache server-side for 5–15min; page request must NOT trigger expensive
   uncached multi-API reads on every widget render. Optionally add
   a secured refresh button that calls a server action and revalidates cache.
7. Read `prisma.lead` only on server after auth; calculate funnel counts
   from real Netgreen lead statuses. Avoid exposing customer PII in public
   API routes or public dashboard. Dashboard should be protected by the
   existing Google login allowlist. Sheet is aggregate/marketing data,
   Netgreen Prisma is customer/job source of truth.

## Required dashboard

- **KPI row**: Ads spend (actual), impressions, clicks, Ads conversions,
  Ads cost per conversion, website sessions, `generate_lead` events,
  `click_to_call` taps, Google Profile calls and profile impressions.
  "Awaiting data" for empty metrics, not zeros.
- **Sales section**: new leads, open leads, quoted total, follow-ups due,
  wins, known won-project values, segregated by lead source (if recorded).
- **Trend chart**: daily spend & conversions by campaign, and optionally
  local Google visibility; no fabricated graphs.
- **Campaign table**: Residential and Commercial names, spend, clicks,
  conversions, CPC, CPA, 7/30/90 days and date range.
- **Pipeline**: stage counts, quoted / won, follow-up actions; link to /leads.
- **Data health panel**: source freshness / last imported date, errors,
  plus note daily Windsor refresh cadence.
- **Filters**: 7 / 30 / 90 days, campaign or channel filter.
- **Print/presentation**: clean header, date range, reporting timestamp,
  printable without navigation, no jargon or inflated ROI claims.
- For **cost per acquired customer** or **ad-attributed revenue/profit**,
  mark "Not available until lead-to-campaign attribution is verified."
  Do not divide total won Netgreen jobs by Ads spend as if every job came
  from Ads. Track lead-level UTM/GCLID later.

## Test + deploy

- Work on a branch. Do not merge old PR #17 wholesale.
- Authenticate before accessing any of the data; maintain existing routes.
- Tests: Google Sheets header changes, empty tabs, no-data states, 28-day
  GB profile rows, GBP parsing, per-campaign dedupe, stale feed, API 403,
  empty GA4, conversion counting and filtering boundaries.
- Run `npm test`, `npm run lint`, `npm run build` with valid local/test
  environment. Confirm existing Jobs, Money, Leads screens still work.
- Preview deploy from new branch; use Vercel project "netgreen" on team
  "ellis-projects-98170302". If Vercel access fails, stop and explain.
- User approves production deploy after preview check. Do NOT silently
  enable new ad campaigns or modify budgets.
- When deployed confirm the real URL `https://netgreen.vercel.app/marketing`
  loads as logged-in owner, reads GBP data, and does not disclose secrets
  or lead personal info to unauthenticated visitors.
- Google Ads is already enabled. This project concerns reporting only.

## User interface direction — strict

**No catchphrases or generic AI marketing copy.** No "Two campaigns. One
clear goal", "Scale smarter", "Marketing intelligence unlocked", gradients
overuse or distracting badges. Use concise professional labels, subtle
dark green / neutral colour, information density, clear spacing,
responsive graphs, realistic data and direct action links.
