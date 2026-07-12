"use client";

import { useState, useEffect, useMemo } from "react";
import { createJobFromCalendar } from "@/app/actions/jobs";
import { computeHourlyPrice, computeWasteTotal, formatMoney } from "@/lib/money";
import { PlusIcon } from "@/components/icons";

type Crew = { id: number; name: string; colour: string };
type CustomerHint = {
  name: string;
  address: string;
  defaultPrice: number | null;
  defaultCrewId: number | null;
};

type PricingMode = "FIXED" | "HOURLY";

const repeats = [
  { value: "NONE", label: "One-off" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "2-weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const workerOptions = [1, 2, 3, 4];

export function JobComposer({
  date,
  crews,
  customers,
  defaultHourlyRate,
}: {
  date: string;
  crews: Crew[];
  customers: CustomerHint[];
  defaultHourlyRate: number;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [what, setWhat] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("FIXED");
  const [price, setPrice] = useState("");
  const [workers, setWorkers] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(String(defaultHourlyRate));
  const [hours, setHours] = useState("");
  const [wasteOn, setWasteOn] = useState(false);
  const [wasteBags, setWasteBags] = useState("");
  const [wasteBagPrice, setWasteBagPrice] = useState("");
  const [crewId, setCrewId] = useState<string>(crews[0] ? String(crews[0].id) : "");
  const [repeat, setRepeat] = useState("NONE");

  useEffect(() => {
    if (crews.length > 0 && (!crewId || !crews.some((c) => String(c.id) === crewId))) {
      setCrewId(String(crews[0].id));
    }
  }, [crews, crewId]);

  const hourlyTotal = useMemo(() => {
    const w = workers;
    const r = parseFloat(hourlyRate) || 0;
    const h = parseFloat(hours) || 0;
    return computeHourlyPrice(w, r, h);
  }, [workers, hourlyRate, hours]);

  const wasteTotal = useMemo(() => {
    if (!wasteOn) return 0;
    return computeWasteTotal(parseFloat(wasteBags) || 0, parseFloat(wasteBagPrice) || 0);
  }, [wasteOn, wasteBags, wasteBagPrice]);

  const basePrice = pricingMode === "HOURLY" ? hourlyTotal : parseFloat(price) || 0;
  const grandTotal = basePrice + wasteTotal;

  function resetForm() {
    setCustomerName("");
    setCustomerAddress("");
    setWhat("");
    setPrice("");
    setWorkers(1);
    setHourlyRate(String(defaultHourlyRate));
    setHours("");
    setWasteOn(false);
    setWasteBags("");
    setWasteBagPrice("");
    setRepeat("NONE");
    setPricingMode("FIXED");
  }

  function onNameChange(value: string) {
    setCustomerName(value);
    const match = customers.find(
      (c) => c.name.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      if (match.address) setCustomerAddress(match.address);
      if (match.defaultPrice != null) {
        setPricingMode("FIXED");
        setPrice(String(match.defaultPrice));
      }
      if (match.defaultCrewId) setCrewId(String(match.defaultCrewId));
    }
  }

  return (
    <form
      action={async (fd) => {
        await createJobFromCalendar(fd);
        resetForm();
      }}
      className="card p-4 sm:p-5"
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="crewId" value={crewId} />
      <input type="hidden" name="repeat" value={repeat} />
      <input type="hidden" name="pricingType" value={pricingMode} />

      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-lime-500 text-white">
          <PlusIcon className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold text-brand-900">
          Add a job
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Customer name</label>
          <input
            name="customerName"
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
            list="customer-hints"
            placeholder="e.g. Mrs Jenkins"
            className="input"
          />
          <datalist id="customer-hints">
            {customers.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            name="customerAddress"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="e.g. 12 Mengham Rd, Hayling Island"
            className="input"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="label">Job</label>
        <input
          name="title"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="Lawn cut, hedge…"
          className="input"
        />
      </div>

      <div className="mt-4">
        <label className="label">Price</label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setPricingMode("FIXED")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              pricingMode === "FIXED"
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            Fixed price
          </button>
          <button
            type="button"
            onClick={() => setPricingMode("HOURLY")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              pricingMode === "HOURLY"
                ? "border-lime-500 bg-lime-100 text-lime-600"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            Hourly
          </button>
        </div>

        {pricingMode === "FIXED" ? (
          <div className="max-w-[200px]">
            <label className="label">Amount £</label>
            <input
              name="price"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 30"
              className="input"
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">People</label>
              <div className="flex flex-wrap gap-1.5">
                {workerOptions.map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setWorkers(n)}
                    className={`min-w-[2.5rem] rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      workers === n
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input type="hidden" name="workers" value={workers} />
            </div>
            <div>
              <label className="label">£ per person / hour</label>
              <input
                name="hourlyRate"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Hours</label>
              <input
                name="hours"
                type="number"
                step="0.25"
                min="0"
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 1.5"
                className="input"
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mb-0">Waste removal</span>
            <button
              type="button"
              onClick={() => setWasteOn((v) => !v)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                wasteOn
                  ? "border-lime-500 bg-lime-100 text-lime-600"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {wasteOn ? "Added" : "Add waste removal"}
            </button>
          </div>

          {wasteOn && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 max-w-[420px]">
              <div>
                <label className="label">Bags</label>
                <input
                  name="wasteBags"
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={wasteBags}
                  onChange={(e) => setWasteBags(e.target.value)}
                  placeholder="e.g. 3"
                  className="input"
                />
              </div>
              <div>
                <label className="label">£ per bag</label>
                <input
                  name="wasteBagPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={wasteBagPrice}
                  onChange={(e) => setWasteBagPrice(e.target.value)}
                  placeholder="e.g. 5"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        {(pricingMode === "HOURLY" || wasteTotal > 0) && (
          <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Total
              </span>
              <span className="ledger text-lg font-extrabold text-brand-800">
                {formatMoney(grandTotal)}
              </span>
            </div>
            {wasteTotal > 0 && (
              <p className="mt-1 text-xs text-stone-400">
                {pricingMode === "HOURLY"
                  ? `${workers} × £${hourlyRate || "0"} × ${hours || "0"}h`
                  : `${formatMoney(basePrice)} job`}
                {" + "}
                {wasteBags || "0"} bags × £{wasteBagPrice || "0"} waste
              </p>
            )}
            {wasteTotal <= 0 && pricingMode === "HOURLY" && (
              <p className="mt-1 text-xs text-stone-400">
                {workers} × £{hourlyRate || "0"} × {hours || "0"}h
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Crew</label>
          {crews.length === 0 ? (
            <p className="text-sm text-stone-500">
              Add who’s working today above before booking jobs.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {crews.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCrewId(String(c.id))}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    crewId === String(c.id)
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.colour }} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label">Repeat</label>
          <div className="flex flex-wrap gap-1.5">
            {repeats.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setRepeat(r.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  repeat === r.value
                    ? "border-lime-500 bg-lime-100 text-lime-600"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          {pricingMode === "HOURLY"
            ? "Hourly jobs work out the total for you — e.g. 2 people at £20 for 2 hours = £80."
            : repeat === "NONE"
              ? "Tip: set a repeat and it'll fill the calendar for you."
              : "Saved as a round — future visits appear automatically."}
        </p>
        <button type="submit" className="btn-primary shrink-0" disabled={crews.length === 0}>
          Add job
        </button>
      </div>
    </form>
  );
}
