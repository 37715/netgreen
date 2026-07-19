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

/** Compact total with expand panel to edit labour, waste, and materials. */
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
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <form
            action={async (fd) => {
              await updateJobExtras(fd);
              setOpen(false);
            }}
            className="absolute right-0 top-full z-20 mt-1 w-[min(19rem,calc(100vw-2rem))] space-y-3 rounded-xl border border-stone-200 bg-white p-3 shadow-lg"
          >
            <input type="hidden" name="id" value={job.id} />
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

            <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
              <span className="ledger text-sm font-bold text-brand-800">
                {formatMoney(previewTotal)}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost !py-1.5 !px-2.5 !text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary !py-1.5 !px-2.5 !text-xs">
                  Save
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
