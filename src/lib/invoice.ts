export function invoiceNumber(jobId: number): string {
  return `INV${String(jobId).padStart(4, "0")}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function invoiceTotals(
  price: number,
  paidAt: Date | null
): {
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
} {
  const total = roundMoney(price);
  const paid = paidAt ? total : 0;

  return {
    subtotal: total,
    total,
    paid,
    balance: roundMoney(total - paid),
  };
}

export function invoiceLineDetail({
  notes,
  wasteBags,
  materialsCharge,
  materialsNote,
}: {
  notes: string;
  wasteBags: number | null;
  materialsCharge: number | null;
  materialsNote: string;
}): string {
  const details = [notes.trim()];

  if (wasteBags != null && wasteBags > 0) {
    details.push(
      `Waste disposal (${wasteBags} ${wasteBags === 1 ? "bag" : "bags"})`
    );
  }

  if (materialsCharge != null && materialsCharge > 0) {
    const material = materialsNote.trim();
    details.push(`Materials${material ? ` (${material})` : ""}`);
  }

  return details.filter(Boolean).join(" · ");
}

const invoiceSettingNames = [
  "invoiceBusinessName",
  "invoicePhone",
  "invoiceEmail",
  "invoiceAddress",
  "invoiceWebsite",
  "invoiceBankName",
  "invoiceAccountNumber",
  "invoiceSortCode",
  "invoiceSigners",
] as const;

export function invoiceSettingsFromFormData(
  formData: FormData
): Record<(typeof invoiceSettingNames)[number], string> {
  return Object.fromEntries(
    invoiceSettingNames.map((name) => [
      name,
      String(formData.get(name) || "").trim(),
    ])
  ) as Record<(typeof invoiceSettingNames)[number], string>;
}
