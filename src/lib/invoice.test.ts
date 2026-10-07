import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
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
