# Job Status Integrity and Manual Revenue Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make job completion toggles concurrency-safe and auditable, and make manually entered weekly revenue-share amounts authoritative Money costs.

**Architecture:** Add optimistic concurrency and an append-only status-event relation around `ScheduledJob`, then route both completion UIs through one pending-aware toggle. Reuse `RevenueShareWeek.amount` as the manual ledger and pass stored weekly costs into the pure finance summaries and month bucketing.

**Tech Stack:** Next.js 16 Server Actions, React 19, Prisma 6/PostgreSQL, TypeScript, Node test runner.

---

### Task 1: Lock the behavior with pure regression tests

**Files:**
- Create: `src/lib/job-status.ts`
- Create: `src/lib/job-status.test.ts`
- Modify: `src/lib/finance.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing job status tests**

Add tests asserting that `buildJobStatusToggle` derives `DONE` from `SCHEDULED` or `SKIPPED`, derives `SCHEDULED` from `DONE`, includes the rendered status and version in its update condition, increments the version, and clears payment data only when leaving `DONE`.

- [ ] **Step 2: Write failing finance tests**

Extend the summary and year-bucket tests with `revenueShares: { amount, date }[]`. Assert manual amounts increase costs and reduce profit, old job percentages do not add any cost, and a weekly amount is placed in the month containing its Monday.

- [ ] **Step 3: Run tests and verify failure**

Run `npm test`.

Expected: FAIL because the status helper and manual finance input do not exist yet.

- [ ] **Step 4: Implement the minimal pure helpers**

Create the status mutation builder and update `summarizeMoney`, `costLinesForMonth`, and `bucketYearMonths` to consume explicit stored revenue-share amounts.

- [ ] **Step 5: Run tests and verify pass**

Run `npm test`.

Expected: PASS.

### Task 2: Add status versioning and audit storage

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/actions/jobs.ts`

- [ ] **Step 1: Extend the Prisma schema**

Add `statusVersion Int @default(0)` and `statusEvents JobStatusEvent[]` to `ScheduledJob`. Add `JobStatusEvent` with `fromStatus`, `toStatus`, optional `actorEmail`, `changedAt`, a cascading job relation, and a `(jobId, changedAt)` index.

- [ ] **Step 2: Generate Prisma client**

Run `npx prisma generate`.

Expected: Prisma client generation succeeds.

- [ ] **Step 3: Implement guarded checkbox transitions**

Authenticate inside `setJobStatus`, parse `expectedStatus` and `expectedVersion`, run an interactive transaction with `updateMany` matching ID/status/version, increment `statusVersion`, and insert an audit event only when one row changes.

- [ ] **Step 4: Version and audit other status mutations**

Increment `statusVersion` in `completeJob` and `rainOffDay`. Record corresponding events so every status change remains explainable.

- [ ] **Step 5: Typecheck**

Run `npx tsc --noEmit`.

Expected: PASS.

### Task 3: Replace unsafe checkbox forms

**Files:**
- Create: `src/components/JobStatusToggle.tsx`
- Modify: `src/components/JobRow.tsx`
- Modify: `src/app/(app)/paid/page.tsx`

- [ ] **Step 1: Build the shared toggle**

Create a client component that posts ID, rendered status, and version to `setJobStatus`. Use `useFormStatus` to disable the button while pending. On `DONE`, intercept submit and require confirmation that unticking also clears payment status.

- [ ] **Step 2: Use it on Calendar**

Add `statusVersion` to `JobRowData` and replace the inline status form with `JobStatusToggle`.

- [ ] **Step 3: Use it on Paid**

Select `statusVersion` for day and owed jobs, add it to `PayJob`, and replace `DoneTick`.

- [ ] **Step 4: Lint and typecheck**

Run `npm run lint && npx tsc --noEmit`.

Expected: PASS.

### Task 4: Make weekly share amounts manually editable

**Files:**
- Modify: `src/app/actions/revenueShares.ts`
- Modify: `src/lib/finance.ts`
- Modify: `src/components/RevenueShareWeeks.tsx`
- Modify: `src/components/RevenueShareCard.tsx`
- Modify: `src/app/(app)/revenue-share/[id]/page.tsx`
- Modify: `src/app/(app)/revenue-share/page.tsx`

- [ ] **Step 1: Add the manual amount action**

Replace settle/undo actions with `setRevenueShareWeekAmount`. Validate a Monday key and non-negative amount, then upsert `RevenueShareWeek.amount`; retain contextual job/labour values when available.

- [ ] **Step 2: Return editable week rows**

Keep current job/labour context, return all requested historical weeks instead of hiding empty ones, and expose stored amount as the authoritative manual value.

- [ ] **Step 3: Replace settle controls**

Render a mobile-friendly currency input and Save button for the current and historical weeks. Remove Mark sent/Undo wording and clearly label calculated percentage data as reference only.

- [ ] **Step 4: Update deal copy**

Change list, card, and detail-page wording so users understand the weekly amount is manually entered and included in Money costs.

- [ ] **Step 5: Verify UI compilation**

Run `npm run lint && npx tsc --noEmit`.

Expected: PASS.

### Task 5: Wire stored weekly costs into Money

**Files:**
- Modify: `src/lib/finance.ts`
- Modify: `src/lib/finance.test.ts`

- [ ] **Step 1: Update range queries**

Query `RevenueShareWeek` where `weekStart` falls in the selected range and pass amounts into `summarizeMoney`. Stop selecting customer percentage relations for Money.

- [ ] **Step 2: Update year queries**

Query all weekly records in the year, map `weekStart` to the finance `date`, and pass them to `bucketYearMonths`.

- [ ] **Step 3: Verify targeted tests**

Run `npm test`.

Expected: PASS with manual share regression coverage.

### Task 6: Full verification and delivery

**Files:**
- All changed files

- [ ] **Step 1: Verify database application safely**

Run Prisma validation/generation locally without resetting or deleting any database data.

- [ ] **Step 2: Run complete checks**

Run `npm test`, `npm run lint`, and `npm run build`.

Expected: all commands succeed.

- [ ] **Step 3: Review the branch diff**

Check that no customer data, credentials, generated artifacts, or unrelated edits are present.

- [ ] **Step 4: Commit and push**

Create clear logical commits and push `cursor/job-status-and-manual-share-74e6`.

- [ ] **Step 5: Create the pull request**

Open a ready-for-review PR targeting `master` with the behavior and verification summarized.
