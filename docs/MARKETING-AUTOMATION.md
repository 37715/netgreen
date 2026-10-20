# EHW marketing automation — secure rollout

The Marketing page is a staging implementation. **Nothing is live until this branch
is reviewed, merged, migrations run and external sources configured.**

## Source of truth

- Netgreen PostgreSQL: identifiable Formspree leads and quote/job statuses.
- MarketingDaily: aggregate daily records from advertising and analytics.
- Google Sheets: optional read-only reporting/export. Do not maintain second mutable lead pipeline.

## Formspree webhooks

Your static EHW website already submits all enquiry forms by `fetch()` to
`https://formspree.io/f/xnjljokj`, and triggers `generate_lead` after Formspree
returns success. Do NOT initialise a second Formspree JavaScript SDK or add
another form submit listener.

Formspree's **Simple Webhook** plugin is available on Professional and
Business plans. Once this branch has passed staging checks and is deployed:

1. Enable Webhook under the form's **Workflow** / plugins.
2. Use the NETGREEN production URL followed by
   `/api/integrations/formspree` (no secret in URL).
3. Obtain Formspree's webhook signing secret and set
   `FORMSPREE_SIGNING_SECRET` as a Vercel *server-side environment variable*.
4. Confirm the webhook JSON is delivered in `{form, keys, submission}` form
   with EHW's expected name, email, phone, location, service/site_type and
   message fields.
5. The receiver checks `Formspree-Signature`, calculates HMAC-SHA256 over
   `timestamp + "." + raw_body` and rejects unauthenticated requests.
6. Test one lead and verify exactly one Netgreen entry; replay the same
   signed payload to check idempotency. Avoid testing with real customers.

If this plan doesn't support webhooks, keep the working Formspree submission
in place and use a secure server-side integration or upgrade plan. Never put
private webhook/API credentials in the public static HTML.

Formspree retries unsuccessful deliveries, so check webhook response times
and configure alerting on delivery failures. Do not merge/deploy this
integration until the form mapping, consent/privacy notices, authentication,
schema migration and tests have been reviewed.

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
