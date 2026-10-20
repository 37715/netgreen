# EHW marketing automation — secure rollout

The Marketing page is a staging implementation. **Nothing is live until this branch
is reviewed, merged, migrations run and external sources configured.**

## Source of truth

- Netgreen PostgreSQL: identifiable Formspree leads and quote/job statuses.
- MarketingDaily: aggregate daily records from advertising and analytics.
- Google Sheets: optional read-only reporting/export. Do not maintain second mutable lead pipeline.

## Customer enquiries (no Formspree subscription)

Use the verified direct EHW website -> Netgreen endpoint
`/api/integrations/ehw-leads`, which requires Cloudflare Turnstile and
origin validation. The existing Formspree website AJAX handler stays live
until the new endpoint is deployed, configured and tested.

See [EHW-DIRECT-FORMS.md](EHW-DIRECT-FORMS.md) for the exact rollout,
environment variables, data mapping and verification steps.

## Windsor.ai / data import

Connected accounts: Google Ads, GA4 and Google Business Profile.
Choose Windsor.ai scheduled exports (or a server-side ETL worker using its API).
Normalize daily data into rows:

{"rows":[{"date":"2026-10-20","source":"google_ads",
"campaign":"EHW | Search | Residential | Oct 2026",
"spend":0,"clicks":0,"impressions":0,"conversions":0},
{"date":"2026-10-20","source":"ga4","sessions":0,"formLeads":0,"phoneClicks":0},
{"date":"2026-10-20","source":"google_business_profile","profileCalls":0,"websiteClicks":0}]}

POST with Authorization: Bearer MARKETING_INGEST_SECRET to
/api/cron/marketing. Records are idempotent by date + source + campaign.
The ingest endpoint is only a receiver: no scheduled pull is wired yet.
Never expose the ingestion secret in public JavaScript. Route all requests
from trusted server-side workers. Store only aggregates in MarketingDaily.

CAUTION: GA4 event names must be mapped to formLeads and phoneClicks.
Google Ads ad-conversions should be aggregated at campaign level, without
double-counting conversions imported from GA4. Use the platform's currency
code and normalize spend into GBP only after verifying account currency.

## Required production review

- Confirm Netgreen auth is enforced; AUTH_DISABLED must not be true in production.
- Review src/proxy.ts routing in Next.js 16 and confirm private routes stay protected.
- Only the metrics API (bearer secret) and EHW public-lead API (Turnstile) should bypass OAuth.
- Review web form payload, customer consent, retention policy and UK GDPR.
- Apply Prisma schema changes to a staging DB; back up production before migration.
- Test success, malformed payload, token rejection and webhook retries.
- Run tests, lint and production build.
- Do not activate advertising campaigns as part of this implementation.
