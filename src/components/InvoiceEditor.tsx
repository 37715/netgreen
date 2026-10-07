"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { saveInvoiceDefaults } from "@/app/actions/invoice";
import { editableInvoiceTotals, hourlyInvoiceTotal } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";

export type InvoiceEditorData = {
  backHref: string;
  currency: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  number: string;
  date: string;
  dueDate: string;
  description: string;
  detail: string;
  pricingType: "FIXED" | "HOURLY";
  quantity: number;
  unitPrice: number;
  workers: number;
  hours: number;
  hourlyRate: number;
  hourlyExtras: number;
  paid: number;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  signers: string;
};

function numericValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function AutoTextarea({
  ariaLabel,
  value,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      rows={1}
      className="invoice-edit-field"
    />
  );
}

function MoneyEditor({
  ariaLabel,
  value,
  onChange,
  currency,
}: {
  ariaLabel: string;
  value: number;
  onChange: (value: number) => void;
  currency: string;
}) {
  return (
    <span className="invoice-money-editor">
      <input
        aria-label={ariaLabel}
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(numericValue(event.target.value))}
        className="invoice-edit-field invoice-number-field invoice-money-input"
      />
      <span className="invoice-print-value">
        {formatMoney(value, currency)}
      </span>
    </span>
  );
}

export function InvoiceEditor({ initial }: { initial: InvoiceEditorData }) {
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [address, setAddress] = useState(initial.address);
  const [website, setWebsite] = useState(initial.website);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);
  const [customerContact, setCustomerContact] = useState(initial.customerContact);
  const [number, setNumber] = useState(initial.number);
  const [date, setDate] = useState(initial.date);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [description, setDescription] = useState(initial.description);
  const [detail, setDetail] = useState(initial.detail);
  const [pricingType, setPricingType] = useState(initial.pricingType);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice);
  const [fixedAmount, setFixedAmount] = useState(
    initial.quantity * initial.unitPrice
  );
  const [workers, setWorkers] = useState(initial.workers);
  const [hours, setHours] = useState(initial.hours);
  const [hourlyRate, setHourlyRate] = useState(initial.hourlyRate);
  const [hourlyExtras, setHourlyExtras] = useState(initial.hourlyExtras);
  const [paid, setPaid] = useState(initial.paid);
  const [bankName, setBankName] = useState(initial.bankName);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [sortCode, setSortCode] = useState(initial.sortCode);
  const [signers, setSigners] = useState(initial.signers);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, startSaving] = useTransition();

  const amount =
    pricingType === "HOURLY"
      ? hourlyInvoiceTotal(workers, hours, hourlyRate, hourlyExtras)
      : fixedAmount;
  const totals = editableInvoiceTotals(1, amount, paid);

  function updateQuantity(value: string) {
    const next = numericValue(value);
    setQuantity(next);
    setFixedAmount(next * unitPrice);
  }

  function updateUnitPrice(value: string) {
    const next = numericValue(value);
    setUnitPrice(next);
    setFixedAmount(quantity * next);
  }

  function saveDefaults() {
    const formData = new FormData();
    formData.set("invoiceBusinessName", businessName);
    formData.set("invoicePhone", phone);
    formData.set("invoiceEmail", email);
    formData.set("invoiceAddress", address);
    formData.set("invoiceWebsite", website);
    formData.set("invoiceBankName", bankName);
    formData.set("invoiceAccountNumber", accountNumber);
    formData.set("invoiceSortCode", sortCode);
    formData.set("invoiceSigners", signers);

    setSaveMessage("");
    startSaving(async () => {
      try {
        await saveInvoiceDefaults(formData);
        setSaveMessage("Saved for future invoices");
      } catch {
        setSaveMessage("Could not save. Please try again.");
      }
    });
  }

  return (
    <div className="invoice-page">
      <div className="mx-auto mb-4 max-w-[210mm] print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={initial.backHref} className="btn-secondary">
            Back to Paid
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={saveDefaults}
              disabled={isSaving}
              className="btn-secondary"
            >
              {isSaving ? "Saving…" : "Save details for next time"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary"
            >
              Print / save PDF
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-stone-700">Invoice pricing:</span>
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1">
            <button
              type="button"
              aria-pressed={pricingType === "FIXED"}
              onClick={() => setPricingType("FIXED")}
              className={`rounded-lg px-3 py-2 font-semibold ${
                pricingType === "FIXED"
                  ? "bg-brand-700 text-white"
                  : "text-stone-600"
              }`}
            >
              Fixed quote
            </button>
            <button
              type="button"
              aria-pressed={pricingType === "HOURLY"}
              onClick={() => setPricingType("HOURLY")}
              className={`rounded-lg px-3 py-2 font-semibold ${
                pricingType === "HOURLY"
                  ? "bg-brand-700 text-white"
                  : "text-stone-600"
              }`}
            >
              Hourly
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Tap any invoice field to edit it. Business and bank details can be
          saved for every future invoice.
        </p>
        {saveMessage && (
          <p className="mt-1 text-xs font-semibold text-brand-700" role="status">
            {saveMessage}
          </p>
        )}
      </div>

      <article className="invoice-document mx-auto bg-white text-[#252525] shadow-xl">
        <header className="invoice-header">
          <Image
            src="/ehw-invoice-logo.jpg"
            width={900}
            height={520}
            alt="EHW Landscapes"
            className="invoice-logo"
            preload
            unoptimized
          />
          <address className="invoice-contact">
            <input
              aria-label="Business phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone"
              className="invoice-edit-field"
            />
            <input
              aria-label="Business email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="invoice-edit-field"
            />
            <input
              aria-label="Business address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Address / postcode"
              className="invoice-edit-field"
            />
            <input
              aria-label="Business website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="Website"
              className="invoice-edit-field"
            />
          </address>
        </header>

        <div className="invoice-title-row">
          <input
            aria-label="Business name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Business name"
            className="invoice-edit-field"
          />
          <div>INVOICE</div>
        </div>

        <section className="invoice-parties">
          <div className="invoice-bill-to">
            <div className="invoice-green-label">BILL TO:</div>
            <div>
              <input
                aria-label="Customer name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                className="invoice-edit-field invoice-customer-name"
              />
              <AutoTextarea
                ariaLabel="Customer address"
                value={customerAddress}
                onChange={setCustomerAddress}
                placeholder="Customer address"
              />
              <AutoTextarea
                ariaLabel="Customer contact details"
                value={customerContact}
                onChange={setCustomerContact}
                placeholder="Customer phone / email"
              />
            </div>
          </div>
          <dl className="invoice-meta">
            <div>
              <dt>NUMBER:</dt>
              <dd>
                <input
                  aria-label="Invoice number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  className="invoice-edit-field"
                />
              </dd>
            </div>
            <div>
              <dt>DATE:</dt>
              <dd>
                <input
                  aria-label="Invoice date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="invoice-edit-field"
                />
              </dd>
            </div>
            <div>
              <dt>DUE DATE:</dt>
              <dd>
                <input
                  aria-label="Invoice due date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="invoice-edit-field"
                />
              </dd>
            </div>
          </dl>
        </section>

        <table
          className={`invoice-lines ${
            pricingType === "HOURLY" ? "invoice-lines-hourly" : ""
          }`}
        >
          <thead>
            <tr>
              <th>Description</th>
              {pricingType === "HOURLY" ? (
                <>
                  <th>People</th>
                  <th>Hours</th>
                  <th>Hourly rate</th>
                  <th>Extras</th>
                </>
              ) : (
                <>
                  <th>Quantity</th>
                  <th>Unit price</th>
                </>
              )}
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  aria-label="Job description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Job description"
                  className="invoice-edit-field invoice-line-title"
                />
                <AutoTextarea
                  ariaLabel="Job details"
                  value={detail}
                  onChange={setDetail}
                  placeholder="Job details"
                />
              </td>
              {pricingType === "HOURLY" ? (
                <>
                  <td>
                    <input
                      aria-label="Person count"
                      type="number"
                      min="0"
                      step="1"
                      value={workers}
                      onChange={(event) =>
                        setWorkers(numericValue(event.target.value))
                      }
                      className="invoice-edit-field invoice-number-field"
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Hours"
                      type="number"
                      min="0"
                      step="0.25"
                      value={hours}
                      onChange={(event) =>
                        setHours(numericValue(event.target.value))
                      }
                      className="invoice-edit-field invoice-number-field"
                    />
                  </td>
                  <td>
                    <MoneyEditor
                      ariaLabel="Hourly rate"
                      value={hourlyRate}
                      onChange={setHourlyRate}
                      currency={initial.currency}
                    />
                  </td>
                  <td>
                    <MoneyEditor
                      ariaLabel="Additional fixed charges"
                      value={hourlyExtras}
                      onChange={setHourlyExtras}
                      currency={initial.currency}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td>
                    <input
                      aria-label="Quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={quantity}
                      onChange={(event) => updateQuantity(event.target.value)}
                      className="invoice-edit-field invoice-number-field"
                    />
                  </td>
                  <td>
                    <MoneyEditor
                      ariaLabel="Unit price"
                      value={unitPrice}
                      onChange={(value) => updateUnitPrice(String(value))}
                      currency={initial.currency}
                    />
                  </td>
                </>
              )}
              <td>
                {pricingType === "HOURLY" ? (
                  <span className="invoice-calculated-amount">
                    {formatMoney(amount, initial.currency)}
                  </span>
                ) : (
                  <MoneyEditor
                    ariaLabel="Line amount"
                    value={fixedAmount}
                    onChange={setFixedAmount}
                    currency={initial.currency}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <section className="invoice-summary">
          <dl>
            <div>
              <dt>SUBTOTAL:</dt>
              <dd>{formatMoney(totals.subtotal, initial.currency)}</dd>
            </div>
            <div>
              <dt>TOTAL:</dt>
              <dd>{formatMoney(totals.total, initial.currency)}</dd>
            </div>
            <div>
              <dt>PAID:</dt>
              <dd>
                <MoneyEditor
                  ariaLabel="Amount paid"
                  value={paid}
                  onChange={setPaid}
                  currency={initial.currency}
                />
              </dd>
            </div>
          </dl>
        </section>

        <section className="invoice-footer">
          <div className="invoice-payment">
            <h2>Payment instructions</h2>
            <input
              aria-label="Bank account name"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Bank account name"
              className="invoice-edit-field"
            />
            <input
              aria-label="Bank account number"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="Account number"
              inputMode="numeric"
              className="invoice-edit-field"
            />
            <input
              aria-label="Bank sort code"
              value={sortCode}
              onChange={(event) => setSortCode(event.target.value)}
              placeholder="Sort code"
              inputMode="numeric"
              className="invoice-edit-field"
            />
          </div>
          <div className="invoice-balance-and-signatures">
            <div className="invoice-balance">
              <span>BALANCE DUE</span>
              <strong>{formatMoney(totals.balance, initial.currency)}</strong>
            </div>
            <div className="invoice-signatures">
              <div className="invoice-signature-lines" aria-hidden="true">
                <span />
                <span />
              </div>
              <input
                aria-label="Signer names"
                value={signers}
                onChange={(event) => setSigners(event.target.value)}
                placeholder="Signer names"
                className="invoice-edit-field"
              />
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
