import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  editableInvoiceTotals,
  hourlyInvoiceAmount,
  invoiceLineDetail,
  invoiceNumber,
  invoiceSettingsFromFormData,
  invoiceTotals,
} from "./invoice";

describe("invoiceNumber", () => {
  it("uses the INV prefix and at least four digits", () => {
    assert.equal(invoiceNumber(74), "INV0074");
    assert.equal(invoiceNumber(12345), "INV12345");
  });
});

describe("invoiceTotals", () => {
  it("leaves the full balance due for an unpaid job", () => {
    assert.deepEqual(invoiceTotals(100, null), {
      subtotal: 100,
      total: 100,
      paid: 0,
      balance: 100,
    });
  });

  it("shows no balance when the job is already paid", () => {
    assert.deepEqual(invoiceTotals(100, new Date("2026-09-28")), {
      subtotal: 100,
      total: 100,
      paid: 100,
      balance: 0,
    });
  });

  it("preserves the stored job amount instead of silently replacing it", () => {
    assert.deepEqual(invoiceTotals(-25, null), {
      subtotal: -25,
      total: -25,
      paid: 0,
      balance: -25,
    });
  });
});

describe("editableInvoiceTotals", () => {
  it("recalculates the line amount and balance from editable values", () => {
    assert.deepEqual(editableInvoiceTotals(2.5, 40, 25), {
      subtotal: 100,
      total: 100,
      paid: 25,
      balance: 75,
    });
  });

  it("rounds money calculations to pennies", () => {
    assert.deepEqual(editableInvoiceTotals(3, 19.995, 10.005), {
      subtotal: 59.99,
      total: 59.99,
      paid: 10.01,
      balance: 49.98,
    });
    assert.deepEqual(editableInvoiceTotals(2.5, 19.99, 0), {
      subtotal: 49.98,
      total: 49.98,
      paid: 0,
      balance: 49.98,
    });
  });
});

describe("hourlyInvoiceAmount", () => {
  it("uses people, hours, and hourly rate", () => {
    assert.equal(hourlyInvoiceAmount(2, 6.5, 35), 455);
  });

  it("rounds the hourly amount to pennies", () => {
    assert.equal(hourlyInvoiceAmount(3, 1.25, 19.99), 74.96);
  });
});

describe("invoiceLineDetail", () => {
  it("combines job notes with recorded waste and materials", () => {
    assert.equal(
      invoiceLineDetail({
        notes: "Climber removal",
        wasteBags: 2,
        materialsCharge: 15,
        materialsNote: "Compost",
      }),
      "Climber removal · Waste disposal (2 bags) · Materials (Compost)"
    );
  });

  it("omits empty optional details", () => {
    assert.equal(
      invoiceLineDetail({
        notes: "",
        wasteBags: null,
        materialsCharge: null,
        materialsNote: "",
      }),
      ""
    );
  });
});

describe("invoiceSettingsFromFormData", () => {
  it("trims editable business and payment details", () => {
    const formData = new FormData();
    formData.set("invoiceBusinessName", " EHW Landscapes ");
    formData.set("invoicePhone", " 07469 237953 ");
    formData.set("invoiceEmail", " accounts@example.com ");
    formData.set("invoiceAddress", " PO11 0JB ");
    formData.set("invoiceWebsite", " https://example.com ");
    formData.set("invoiceBankName", " EHW Landscapes ");
    formData.set("invoiceAccountNumber", " 12345678 ");
    formData.set("invoiceSortCode", " 12-34-56 ");
    formData.set("invoiceSigners", " Hugo Wheeler + Ellis Wheeler ");

    assert.deepEqual(invoiceSettingsFromFormData(formData), {
      invoiceBusinessName: "EHW Landscapes",
      invoicePhone: "07469 237953",
      invoiceEmail: "accounts@example.com",
      invoiceAddress: "PO11 0JB",
      invoiceWebsite: "https://example.com",
      invoiceBankName: "EHW Landscapes",
      invoiceAccountNumber: "12345678",
      invoiceSortCode: "12-34-56",
      invoiceSigners: "Hugo Wheeler + Ellis Wheeler",
    });
  });
});
