# Paid Job Invoice Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-tap, exact-format printable invoice for every completed job shown in Paid.

**Architecture:** Keep invoice rendering server-side and derive a stable invoice from one completed `ScheduledJob`. Isolate invoice numbering/totals/detail rules in a tested library, keep business/payment details configurable in `Settings`, and render the supplied visual design as responsive HTML with A4 print CSS.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Prisma 6/PostgreSQL, Tailwind CSS 4, Node test runner.

---

## File structure

- Create `src/lib/invoice.ts`: pure invoice number, totals, and line-detail rules.
- Create `src/lib/invoice.test.ts`: regression coverage for invoice rules.
- Create `src/app/(app)/paid/[id]/invoice/page.tsx`: completed-job query and exact invoice document.
- Create `public/ehw-invoice-logo.jpg`: cropped supplied EHW logo.
- Modify `prisma/schema.prisma`: configurable invoice business/bank fields.
- Modify `src/app/actions/settings.ts`: save invoice settings.
- Modify `src/app/(app)/settings/page.tsx`: invoice settings form.
- Modify `src/app/(app)/paid/page.tsx`: job-level Invoice actions.
- Modify `src/app/globals.css`: A4 page and print-only invoice rules.
- Modify `package.json`: include invoice tests in the test suite.

### Task 1: Invoice calculation rules

**Files:**
- Create: `src/lib/invoice.test.ts`
- Create: `src/lib/invoice.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Cover:

```ts
assert.equal(invoiceNumber(74), "INV0074");
assert.deepEqual(invoiceTotals(100, null), {
  subtotal: 100,
  total: 100,
  paid: 0,
  balance: 100,
});
assert.deepEqual(invoiceTotals(100, new Date()), {
  subtotal: 100,
  total: 100,
  paid: 100,
  balance: 0,
});
assert.equal(
  invoiceLineDetail({
    notes: "Climber removal",
    wasteBags: 2,
    materialsCharge: 15,
    materialsNote: "Compost",
  }),
  "Climber removal · Waste disposal (2 bags) · Materials (Compost)"
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test src/lib/invoice.test.ts`

Expected: FAIL because `src/lib/invoice.ts` does not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Export:

```ts
export function invoiceNumber(jobId: number): string;
export function invoiceTotals(price: number, paidAt: Date | null): {
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
};
export function invoiceLineDetail(input: {
  notes: string;
  wasteBags: number | null;
  materialsCharge: number | null;
  materialsNote: string;
}): string;
```

- [ ] **Step 4: Add the test file to `npm test` and verify GREEN**

Run: `npm test`

Expected: all suites pass, including four invoice assertions.

- [ ] **Step 5: Commit**

```bash
git add package.json src/lib/invoice.ts src/lib/invoice.test.ts
git commit -m "Add tested job invoice calculations"
```

### Task 2: Configurable invoice business details

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/actions/settings.ts`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add Settings fields with supplied defaults**

Add:

```prisma
invoiceBusinessName String @default("EHW Landscapes")
invoicePhone String @default("07469237953")
invoiceEmail String @default("ehwlandscapes@gmail.com")
invoiceAddress String @default("PO11 0JB")
invoiceWebsite String @default("https://ehwlandscapes.com")
invoiceBankName String @default("")
invoiceAccountNumber String @default("")
invoiceSortCode String @default("")
invoiceSigners String @default("Hugo Wheeler + Ellis Wheeler")
```

- [ ] **Step 2: Parse and save every invoice field in `updateSettings`**

Trim string values from `FormData` and include them in the Settings upsert.

- [ ] **Step 3: Add an “Invoice details” Settings panel**

Use existing `input` and `label` classes. Group contact and bank fields, and preserve existing Business/Crews/Access sections.

- [ ] **Step 4: Generate Prisma client and type-check**

Run:

```bash
DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" npx prisma generate
npx tsc --noEmit
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/app/actions/settings.ts src/app/\(app\)/settings/page.tsx
git commit -m "Add configurable invoice business details"
```

### Task 3: Exact-format printable invoice

**Files:**
- Create: `src/app/(app)/paid/[id]/invoice/page.tsx`
- Create: `public/ehw-invoice-logo.jpg`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read the bundled Next.js 16 page and image guides**

Read:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`

- [ ] **Step 2: Extract supplied visual assets**

Crop the supplied reference:

- Logo: left header logo only.
- Do not store handwritten signatures in the public repository; render
  signature lines and signer names from Settings.

Save compressed JPGs under `public/` and verify each with the image reader.

- [ ] **Step 3: Query and validate the job**

The route must:

```ts
prisma.scheduledJob.findUnique({
  where: { id: Number(id) },
  include: { customer: true },
});
```

Call `notFound()` when the job is absent or `status !== "DONE"`. Load Settings in parallel where possible.

- [ ] **Step 4: Build the invoice document**

Render:

- Non-print Back and `PrintButton` controls.
- Logo/contact header.
- Business/INVOICE title divider.
- Bill-to and metadata columns.
- Green line-item table.
- Subtotal/total/paid rows.
- Dark balance-due bar.
- Bank instructions and signature lines.

Use `invoiceNumber`, `invoiceTotals`, and `invoiceLineDetail`. Format the date from `completedAt ?? date`.

- [ ] **Step 5: Add A4 print rules**

Scope styles beneath `.invoice-document` and include:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  .invoice-document {
    width: 210mm;
    min-height: 297mm;
    box-shadow: none;
  }
}
```

Ensure the preview remains horizontally contained on a 390px viewport.

- [ ] **Step 6: Type-check and lint**

Run:

```bash
npx tsc --noEmit
npx eslint 'src/app/(app)/paid/[id]/invoice/page.tsx' src/app/globals.css
```

Expected: no errors in TypeScript or the page.

- [ ] **Step 7: Commit**

```bash
git add public/ehw-invoice-logo.jpg src/app/\(app\)/paid/\[id\]/invoice/page.tsx src/app/globals.css
git commit -m "Build print-ready EHW job invoice"
```

### Task 4: Paid page Generate invoice actions

**Files:**
- Modify: `src/app/(app)/paid/page.tsx`

- [ ] **Step 1: Add completed-job invoice links**

For `DayRow` and `OwedRow`, show a minimum 44px Invoice action only when `status === "DONE"`. Preserve cash/bank controls and mobile wrapping.

Use:

```tsx
<Link href={`/paid/${job.id}/invoice`} className="...">
  Invoice
</Link>
```

- [ ] **Step 2: Verify hidden state**

Confirm scheduled/skipped jobs do not show an invoice action and the route independently rejects them.

- [ ] **Step 3: Type-check and lint**

Run:

```bash
npx tsc --noEmit
npx eslint 'src/app/(app)/paid/page.tsx'
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/paid/page.tsx
git commit -m "Add invoice actions to completed paid jobs"
```

### Task 5: End-to-end verification and deployment

**Files:**
- Modify only if verification finds a defect.

- [ ] **Step 1: Commit and push pre-verification state**

Run:

```bash
git push -u origin cursor/job-invoice-generator-74e6
```

Create the draft PR against `master`.

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm test
npx tsc --noEmit
npx eslint src/lib/invoice.ts src/lib/invoice.test.ts 'src/app/(app)/paid/page.tsx' 'src/app/(app)/paid/[id]/invoice/page.tsx' src/app/actions/settings.ts 'src/app/(app)/settings/page.tsx'
env -u DATABASE_URL -u DIRECT_URL -u VERCEL_ENV npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Request code review**

Review the complete diff against this design. Fix all Critical and Important findings, then rerun focused verification.

- [ ] **Step 4: Perform mobile and A4 walkthrough**

With a real completed job:

- Capture a 390px Paid row showing Invoice.
- Open the invoice and capture the mobile preview.
- Capture an A4/full-page print view showing header, bill-to, line item,
  totals, balance bar, bank details, and signature lines.

- [ ] **Step 5: Push fixes and update PR evidence**

Commit each correction, push, and update the PR body with verification and screenshots.

- [ ] **Step 6: Promote and verify production**

Fast-forward the verified commit to `master`, subscribe to master CI, and confirm the production Paid route still redirects unauthenticated users to login.
