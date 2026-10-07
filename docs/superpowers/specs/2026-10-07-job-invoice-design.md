# Paid Job Invoice Generator Design

## Goal

Add a one-tap **Generate invoice** action to completed jobs in the Paid section. The generated invoice uses the job, customer, payment, and business data already in Netgreen and matches the supplied EHW invoice layout as closely as practical in responsive HTML and print/PDF output.

## Chosen approach

Use a server-rendered, print-optimised invoice page for each job.

- Recommended over a client PDF library because browser printing produces a clean PDF without adding a large dependency.
- Recommended over a new persisted Invoice model because each invoice contains one existing job and can use a stable number derived from that job.
- The existing customer-level invoice remains unchanged; this is a separate per-job invoice flow from Paid.

## User flow

1. A job is checked off as done in Paid.
2. An **Invoice** button appears on that job.
3. Tapping it opens `/paid/{jobId}/invoice`.
4. The page is filled automatically from the job and its customer.
5. **Print / save PDF** opens the browser print dialog.
6. A back action returns to the same Paid date.

The invoice route rejects missing jobs and jobs that have not been checked off.

## Invoice content

- EHW logo and contact details in the top right.
- “EHW Landscapes” and “INVOICE” heading row.
- Customer name, address, and contact details.
- Stable invoice number: `INV` plus the zero-padded job ID, for example `INV0074`.
- Invoice date: completion date, falling back to the scheduled job date.
- Due date: “On receipt”.
- One line item:
  - Description: job title.
  - Detail: notes and recorded waste/material details when present.
  - Quantity: 1.
  - Unit price and amount: the job price.
- Subtotal and total equal the job price.
- Paid equals the job price when `paidAt` exists, otherwise zero.
- Balance due equals total minus paid.
- Payment instructions, signature lines, and signer names.

## Business configuration

Extend Settings with invoice-specific fields so the supplied details are defaults but remain editable:

- Phone
- Email
- Address/postcode
- Website
- Bank account name
- Account number
- Sort code
- Signer names

The supplied EHW logo is stored as a static brand asset. Handwritten
signatures and bank values are not stored in the public source repository;
bank values are entered through authenticated Settings.

## Layout

The A4 print view follows the supplied reference:

- Large white page with generous whitespace.
- Logo top left and muted contact details top right.
- Bold business/invoice title split across the page.
- Green bill-to/invoice-label accents.
- Green line-item table header.
- Totals aligned right.
- Dark horizontal balance-due bar.
- Payment instructions bottom left and signature lines/names bottom right.

On mobile, the preview scales within the viewport while controls remain outside the printable page. Print CSS removes navigation, buttons, card borders, and shadows and sets A4 portrait margins.

## Error handling

- Unknown job ID returns the normal not-found page.
- A non-completed job returns not found so draft work cannot be invoiced accidentally.
- Missing customer data falls back to “Customer” and omits blank address/contact lines.
- Missing business settings omit only the blank line; totals and job data still render.

## Testing

- Unit tests cover stable invoice numbers, paid/balance totals, and description detail assembly.
- TypeScript and changed-file ESLint must pass.
- Production build must pass without preview database credentials.
- A 390px mobile walkthrough verifies the Paid action and invoice preview.
- An A4 screenshot verifies the printable layout against the supplied reference.
