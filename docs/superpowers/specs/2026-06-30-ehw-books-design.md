# netgreen — Design Spec

Date: 2026-06-30
Owner: Ellis Wheeler (netgreen, partnership with Hugo Wheeler)

## Purpose

netgreen is busy but "in the dark" on money. This tool moves the business
from busy-tradesman mode into business mode by making revenue, costs, profit and
per-job margins **measurable and repeatable** — driven by the daily job calendar
so there is little to no separate bookkeeping.

## Key decisions (from brainstorming)

- **Form factor:** phone-friendly web app, also good on laptop.
- **Hosting:** local-first (runs on owner's computer). Built so going online with a
  shared login for both brothers is a small step, not a rebuild.
- **Two speeds of income:** quick maintenance income is near-instant to log; only
  big landscaping projects get full cost/margin breakdowns.
- **Margin definition:** cash in − cash out. Owners' (Ellis & Hugo) time is NOT a
  cost — their pay is the profit. Only real money out counts (materials, employee
  wages, hire, waste, etc.).
- **Calendar is the daily driver:** ordered run sheet per crew (no fixed clock
  times), drag to reorder, tick jobs off on-site → completed job becomes income
  automatically.
- **Crews:** up to two crews for now (editable).
- **Recurring rounds:** customers can be weekly / fortnightly / monthly and
  auto-fill onto the calendar.
- **Reimbursed materials:** treated as revenue in AND cost out; profit is only the
  markup.
- **Assumptions:** not VAT-registered yet; default employee rate £20/hr (editable);
  currency GBP.

## What it tracks

1. **Calendar / scheduling** — ordered run sheet per crew per day; week overview;
   recurring rounds auto-filled; tick-off completes a job and books income.
2. **Crews** — Crew 1 & Crew 2 (editable name + members).
3. **Quick income** — completed maintenance jobs (from tick-off or manual add).
4. **Projects** — big jobs: quoted price, costs (materials/wages/hire/waste/other),
   payments received → profit & margin %.
5. **Overheads** — general business costs not tied to a job (tools, fuel, insurance,
   van, software, other), by category.
6. **Customers** — name, contact, address, recurring schedule, default price.

## Dashboard

For a selected range (this week / month / custom):
- Revenue in (quick income + project payments)
- Costs out (overheads + project costs)
- Profit (= revenue − costs)
- Project league table (best/worst margin %)
- Outstanding (projects quoted but not fully paid)

## Tech

- **Next.js (App Router) + TypeScript** — responsive, modern UI.
- **Tailwind CSS** — clean styling, mobile-first.
- **Prisma + SQLite** — single-file DB, easy backup; switch to hosted Postgres when
  going online by changing the datasource provider.

## Data model (Prisma, summary)

- `Settings` (singleton): businessName, employeeRate, currency.
- `Crew`: name, members, colour, active.
- `Customer`: name, contact, address, recurrence (NONE/WEEKLY/FORTNIGHTLY/MONTHLY),
  recurrenceAnchor, defaultPrice, defaultCrewId, notes, active.
- `ScheduledJob` (a visit): date, crewId, customerId?, title, order, price,
  status (SCHEDULED/DONE/SKIPPED), completedAt, projectId?, notes,
  recurringSourceCustomerId?.
- `Project`: title, customerId?, status (QUOTE/ACTIVE/DONE/PAID), quotedPrice,
  startDate, notes.
- `ProjectCost`: projectId, category (MATERIALS/WAGES/HIRE/WASTE/OTHER),
  description, amount, reimbursable, date.
- `Payment`: projectId, amount, date, method, note.
- `Overhead`: date, category (TOOLS/FUEL/INSURANCE/VAN/SOFTWARE/OTHER),
  description, amount.

## Money rules

- Quick income revenue = completed `ScheduledJob.price` within range.
- Project revenue (cash basis) = `Payment` totals within range.
- Costs out = `Overhead` + `ProjectCost` within range.
- Profit = revenue − costs.
- Per-project margin = (total payments − total costs) / total payments.

## Not in v1 (add later)

Bank auto-feeds, receipt photos, quote/invoice PDFs, VAT, payroll, GPS/route
optimisation, online deploy + shared login.
