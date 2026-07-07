# netgreen

A simple, phone-friendly tool for **netgreen** to stop being in the dark on
money. Schedule the day's jobs, tick them off on-site, and the app works out your
**revenue, costs, profit and per-job margins** automatically.

Built for Ellis & Hugo Wheeler.

## What it does

- **Calendar / run sheets** — each crew gets an ordered list of jobs per day. Tick
  a job off on your phone and it instantly counts as income.
- **Recurring rounds** — set a customer to weekly / fortnightly / monthly and they
  auto-fill onto the calendar. No re-typing the round.
- **Quick income** — everyday maintenance jobs are near-instant to log.
- **Projects** — bigger jobs (patios, fencing, turfing) track materials, employee
  wages, hire, waste and payments → **profit & margin %**.
- **Overheads** — general costs not tied to a job (tools, fuel, insurance, van,
  subscriptions).
- **Dashboard** — week / month / year view of revenue, costs, profit, a project
  league table (best/worst margins) and who still owes you money.

## How margins are worked out

`Margin = (money in − money out) ÷ money in`

Your and Hugo's time is **not** counted as a cost — that's your profit. Only real
money out counts (materials, employee wages, hire, waste).

**Reimbursed materials:** if a customer pays you back for materials, log the cost on
the project *and* log their repayment as a payment. Profit then stays just your
markup, while turnover stays honest.

## Running it

Requires [Node.js](https://nodejs.org) 20+.

```bash
npm install
npx prisma migrate dev   # first time only: creates the database
npm run seed             # optional: adds your 2 crews + sample customers
npm run dev              # start it
```

Then open **http://localhost:3000**. On your phone, use the laptop's network
address (shown in the terminal, e.g. `http://192.168.0.144:3000`) while on the
same Wi-Fi.

For a faster, optimised version:

```bash
npm run build
npm start
```

## Your data

Everything lives in a single file: `prisma/dev.db` on this computer. **Back this
file up** (copy it somewhere safe) to protect your records. It is deliberately kept
out of git.

## Going online later

The app is built local-first but ready to go online so both brothers share one
live set of numbers from anywhere:

1. Change the Prisma datasource `provider` from `sqlite` to `postgresql`.
2. Point `DATABASE_URL` at a hosted database.
3. Deploy (e.g. Vercel or Railway) and add a simple shared login.

## Planned for later (not in v1)

Bank import, receipt photos, quote/invoice PDFs, VAT, payroll.
