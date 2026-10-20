# EHW marketing automation — secure rollout

The Marketing page is a staging implementation. **Nothing is live until this branch
is reviewed, merged, migrations run and external sources configured.**

## Source of truth

- Netgreen PostgreSQL: identifiable Formspree leads and quote/job statuses.
- MarketingDaily: aggregate daily records from advertising and analytics.
- Google Sheets: optional read-only reporting/export. Do not maintain second mutable lead pipeline.

## Formspree webhooks

Create a long random FORMSPREE_WEBHOOK_SECRET in production environment settings.
Use Formspree's webhook integration (if available on your account) to POST to:
https://YOUR-NETGREEN-DOMAIN/api/integrations/formspree?token=LONG_SECRET

Never include the token in client-side HTML, logs or Git. Check Formspree's
actual webhook JSON structure and map its form field names before enabling.
Verify the resulting lead appears once even on a retry and doesn't overwrite
existing sales notes. Formspree webhooks may require a paid plan.

If Formspree cannot deliver a secure webhook, instead use a trusted backend
relay or server-side submission workflow. Do not post from the public site
directly to the private Netgreen lead API using embedded credentials.

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
- Move route protection to the correct middleware/proxy approach for Next.js 16
  before exposing the ingest endpoint on the internet.
- Only the two secret-protected integration routes should bypass interactive OAuth.
- Review Formspree payload, customer consent, retention policy and UK GDPR.
- Apply Prisma schema changes to a staging DB; back up production before migration.
- Test success, malformed payload, token rejection and webhook retries.
- Run tests, lint and production build.
- Do not activate advertising campaigns as part of this implementation.
