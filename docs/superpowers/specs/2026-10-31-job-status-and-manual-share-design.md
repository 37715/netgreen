# Job Status Integrity and Manual Revenue Share Design

## Goal

Stop completed jobs being accidentally changed back to incomplete while keeping the checkbox reversible, and replace Howard's calculated percentage payout with editable weekly amounts that feed directly into Money costs.

## Job status integrity

The calendar and Paid page keep the same checkbox. Marking a job done remains one tap. Changing a completed job back to scheduled requires a browser confirmation, and the control is disabled while the save is in flight.

Every job has a monotonic `statusVersion`. A checkbox submits the status and version that were rendered. The server updates only when both still match. If an older page or a double tap submits stale data, the conditional update affects no row and cannot overwrite the newer status.

Each successful status transition creates a `JobStatusEvent` containing the job, old status, new status, signed-in email when available, and timestamp. Other bulk or direct status actions increment the same version so they cannot be overwritten by an older checkbox submission.

Unticking a completed job preserves the existing business rule: it changes the job to scheduled and clears its payment record. The confirmation states that consequence explicitly.

## Manual revenue-share costs

`RevenueShareWeek.amount` becomes the authoritative manual weekly amount. The existing stored weekly snapshots remain valid initial values, so no historical data is discarded.

The weekly UI shows the current week and earlier weeks, including weeks with no tagged jobs. Each row has an amount input and Save button. Saving upserts the amount for that deal and Monday. An amount of zero is stored so the user can explicitly record a zero-cost week.

The existing percentage and customer tagging remain as reference information only. They can still show job and labour context, but calculated percentage figures no longer enter Money and the UI must not imply that they do.

Money queries stored `RevenueShareWeek` rows directly. Each amount is a business cost in the month containing that week's Monday. Stored costs remain in historical reports even if the deal is later inactive.

## Error handling and validation

Status submissions with invalid IDs, versions, or statuses do nothing. Stale submissions do nothing and are followed by route revalidation so the current state is rendered.

Weekly amounts accept non-negative currency values. Invalid share IDs, dates, or negative values do nothing. Saves revalidate the dashboard, Money, revenue-share list, and deal page.

## Verification

Pure regression tests cover the status compare-and-swap contract, manual share inclusion in totals, exclusion of automatic percentage costs, and month bucketing by Monday. Prisma generation, all tests, lint, and the production build verify integration.
