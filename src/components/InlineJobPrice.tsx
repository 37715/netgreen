"use client";

import { useMemo, useState } from "react";
import { updateJobExtras } from "@/app/actions/jobs";
import { computeWasteTotal, formatMoney } from "@/lib/money";

export type JobPriceExtras = {
  id: number;
  price: number;
  pricingType?: "FIXED" | "HOURLY";
  hourlyRate?: number | null;
  hours?: number | null;
  workers?: number | null;
  wasteBags?: number | null;
  wasteBagPrice?: number | null;
  materialsCharge?: number | null;
  materialsPaid?: number | null;
  materialsNote?: string;
};

function labourFromJob(job: JobPriceExtras): number {
  const waste =
    (job.wasteBags ?? 0) > 0 && (job.wasteBagPrice ?? 0) > 0
      ? computeWasteTotal(job.wasteBags!, job.wasteBagPrice!)
      : 0;
  const materials = job.materialsCharge ?? 0;
  return Math.max(0, Math.round((job.price - waste - materials) * 100) / 100);
}

/** Compact total with a sheet to edit labour, waste, and materials. */
export function InlineJobPrice({ job }: { job: JobPriceExtras }) {
  const [open, setOpen] = useState(false);
  const initialLabour = labourFromJob(job);
  const hasWaste = (job.wasteBags ?? 0) > 0 && (job.wasteBagPrice ?? 0) > 0;
  const hasMaterials =
    (job.materialsCharge ?? 0) > 0 || (job.materialsPaid ?? 0) > 0;

  const [labour, setLabour] = useState(String(initialLabour || ""));
  const [wasteOn, setWasteOn] = useState(hasWaste);
  const [wasteBags, setWasteBags] = useState(
    hasWaste ? String(job.wasteBags) : ""
  );
  const [wasteBagPrice, setWasteBagPrice] = useState(
    hasWaste ? String(job.wasteBagPrice) : ""
  );
  const [materialsOn, setMaterialsOn] = useState(hasMaterials);
  const [materialsCharge, setMaterialsCharge] = useState(
    hasMaterials && job.materialsCharge ? String(job.materialsCharge) : ""
  );
  const [materialsPaid, setMaterialsPaid] = useState(
    hasMaterials && job.materialsPaid ? String(job.materialsPaid) : ""
  );
  const [materialsNote, setMaterialsNote] = useState(job.materialsNote ?? "");

  const wasteTotal = useMemo(() => {
    if (!wasteOn) return 0;
    return computeWasteTotal(
      parseFloat(wasteBags) || 0,
      parseFloat(wasteBagPrice) || 0
    );
  }, [wasteOn, wasteBags, wasteBagPrice]);

  const materialsChargeTotal = useMemo(() => {
    if (!materialsOn) return 0;
    return Math.max(0, parseFloat(materialsCharge) || 0);
  }, [materialsOn, materialsCharge]);

  const previewTotal =
    (parseFloat(labour) || 0) + wasteTotal + materialsChargeTotal;

  function openEditor() {
    setLabour(String(labourFromJob(job) || ""));
    setWasteOn(hasWaste);
    setWasteBags(hasWaste ? String(job.wasteBags) : "");
    setWasteBagPrice(hasWaste ? String(job.wasteBagPrice) : "");
    setMaterialsOn(hasMaterials);
    setMaterialsCharge(
      hasMaterials && job.materialsCharge ? String(job.materialsCharge) : ""
    );
    setMaterialsPaid(
      hasMaterials && job.materialsPaid ? String(job.materialsPaid) : ""
    );
    setMaterialsNote(job.materialsNote ?? "");
    setOpen(true);
  }

  const extrasHint =
    hasWaste || hasMaterials
      ? [
          hasWaste ? "waste" : null,
          hasMaterials ? "materials" : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openEditor())}
        title="Edit price, waste, materials"
        className="ledger rounded-lg border border-transparent px-1 py-1 text-right text-sm font-semibold text-stone-800 hover:border-stone-200 hover:bg-white"
      >
        {formatMoney(job.price)}
        {extrasHint && (
          <span className="mt-0.5 block text-[10px] font-semibold normal-case tracking-normal text-stone-400">
            +{extrasHint}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <form
            action={async (fd) => {
              await updateJobExtras(fd);
              setOpen(false);
            }}
            className="relative z-10 flex max-h-[min(85dvh,36rem)] w-full max-w-md flex-col rounded-t-2xl border border-stone-200 bg-white shadow-xl sm:rounded-2xl"
          >
            <input type="hidden" name="id" value={job.id} />

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <div>
                <div className="font-display text-sm font-bold text-brand-900">
                  Edit price
                </div>
                <div className="text-xs text-stone-400">
                  Labour, waste & materials
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost !py-1.5 !px-2.5 !text-xs"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              <div>
                <label className="label">Labour £</label>
                <input
                  name="labour"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={labour}
                  onChange={(e) => setLabour(e.target.value)}
                  className="input !py-1.5 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="label mb-0">Waste removal</span>
                  <button
                    type="button"
                    onClick={() => setWasteOn((v) => !v)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      wasteOn
                        ? "border-lime-500 bg-lime-100 text-lime-600"
                        : "border-stone-200 text-stone-600"
                    }`}
                  >
                    {wasteOn ? "On" : "Add"}
                  </button>
                </div>
                {wasteOn && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
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
                        className="input !py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="label">£ / bag</label>
                      <input
                        name="wasteBagPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={wasteBagPrice}
                        onChange={(e) => setWasteBagPrice(e.target.value)}
                        className="input !py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="label mb-0">Materials</span>
                  <button
                    type="button"
                    onClick={() => setMaterialsOn((v) => !v)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      materialsOn
                        ? "border-lime-500 bg-lime-100 text-lime-600"
                        : "border-stone-200 text-stone-600"
                    }`}
                  >
                    {materialsOn ? "On" : "Add"}
                  </button>
                </div>
                {materialsOn && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Charge £</label>
                        <input
                          name="materialsCharge"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          value={materialsCharge}
                          onChange={(e) => setMaterialsCharge(e.target.value)}
                          placeholder="e.g. 20"
                          className="input !py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="label">We paid £</label>
                        <input
                          name="materialsPaid"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          value={materialsPaid}
                          onChange={(e) => setMaterialsPaid(e.target.value)}
                          placeholder="e.g. 12"
                          className="input !py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">What for?</label>
                      <input
                        name="materialsNote"
                        value={materialsNote}
                        onChange={(e) => setMaterialsNote(e.target.value)}
                        placeholder="Weedkiller, compost, plants…"
                        className="input !py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <span className="ledger text-base font-bold text-brand-800">
                {formatMoney(previewTotal)}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost !py-2 !px-3 !text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary !py-2 !px-4 !text-sm">
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
