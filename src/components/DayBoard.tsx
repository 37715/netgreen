"use client";

import { useState } from "react";
import { JobRow, JobRowData, CrewOption } from "@/components/JobRow";
import { assignJobToCrew } from "@/app/actions/jobs";
import { addCrewLabour, removeCrewLabour } from "@/app/actions/labour";
import { formatMoney } from "@/lib/money";
import { PlusIcon } from "@/components/icons";

export type GroupInfo = {
  id: number | null;
  name: string;
  colour: string;
  members: string;
};

export type BoardJob = JobRowData & { crewId: number | null };

export type LabourEntry = {
  id: number;
  crewId: number | null;
  name: string;
  amount: number;
};

export function DayBoard({
  date,
  groups,
  jobs,
  labour,
  currency,
  defaultRate,
}: {
  date: string;
  groups: GroupInfo[];
  jobs: BoardJob[];
  labour: LabourEntry[];
  currency: string;
  defaultRate: number;
}) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const crewOptions: CrewOption[] = [
    ...groups
      .filter((g) => g.id != null)
      .map((g) => ({ id: g.id, name: g.name, colour: g.colour })),
    { id: null, name: "Unassigned", colour: "#97a08e" },
  ];

  async function move(id: number, groupId: number | null) {
    const job = jobs.find((j) => j.id === id);
    if (!job || (job.crewId ?? null) === groupId) return;
    await assignJobToCrew(id, groupId);
  }

  async function handleDrop(groupId: number | null) {
    const id = draggingId;
    setDraggingId(null);
    setOverKey(null);
    if (id == null) return;
    await move(id, groupId);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((g) => {
        const key = String(g.id);
        const crewJobs = jobs.filter((j) => (j.crewId ?? null) === g.id);
        const crewLabour = labour.filter((l) => (l.crewId ?? null) === g.id);
        const crewDone = crewJobs.filter((j) => j.status === "DONE");
        const crewTakings = crewDone.reduce((s, j) => s + j.price, 0);
        const crewExpected = crewJobs.reduce((s, j) => s + j.price, 0);
        const crewWages = crewLabour.reduce((s, l) => s + l.amount, 0);
        const crewMaterials = crewDone.reduce(
          (s, j) => s + (j.materialsPaid ?? 0),
          0
        );
        const crewCosts = crewWages + crewMaterials;
        const crewProfit = crewTakings - crewCosts;
        const isCrew = g.id != null;
        const isOver = overKey === key && draggingId != null;

        return (
          <div
            key={key}
            onDragOver={(e) => {
              if (draggingId == null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overKey !== key) setOverKey(key);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setOverKey((prev) => (prev === key ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(g.id);
            }}
            className={`card overflow-hidden border-l-4 transition-shadow ${
              isOver ? "ring-2 ring-brand-400 ring-offset-1" : ""
            }`}
            style={{ borderLeftColor: g.colour }}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
              <div>
                <h2 className="font-display text-base font-bold text-brand-900">
                  {g.name}
                </h2>
                {g.members && (
                  <div className="text-xs text-stone-400">{g.members}</div>
                )}
              </div>
              <span className="badge bg-stone-100 text-stone-600">
                {crewJobs.length} {crewJobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>

            {crewJobs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-400">
                {isOver
                  ? "Drop to move here"
                  : draggingId != null
                    ? "Drag a job here"
                    : "Nothing booked. Add a job above or drag one here."}
              </p>
            ) : (
              <div className="divide-y divide-stone-100 px-4">
                {crewJobs.map((j, i) => (
                  <JobRow
                    key={j.id}
                    job={j}
                    isFirst={i === 0}
                    isLast={i === crewJobs.length - 1}
                    draggable
                    dragging={draggingId === j.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    crewOptions={crewOptions}
                    currentCrewId={g.id}
                    onAssign={(crewId) => move(j.id, crewId)}
                  />
                ))}
              </div>
            )}

            {isCrew && (
              <div className="border-t border-stone-100 px-4 py-3">
                <div className="eyebrow mb-1.5">Extra hands</div>
                {crewLabour.length > 0 && (
                  <ul className="mb-2 space-y-1.5">
                    {crewLabour.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-sm"
                      >
                        <span className="truncate font-semibold text-stone-700">
                          {l.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="ledger font-semibold text-clay-600">
                            −{formatMoney(l.amount, currency)}
                          </span>
                          <form action={removeCrewLabour}>
                            <input type="hidden" name="id" value={l.id} />
                            <button
                              type="submit"
                              aria-label={`Remove ${l.name}`}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-clay-600"
                            >
                              ×
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  action={addCrewLabour}
                  className="flex items-end gap-2"
                >
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="crewId" value={g.id ?? ""} />
                  <div className="min-w-0 flex-1">
                    <label className="label">Who</label>
                    <input
                      name="name"
                      placeholder="e.g. Dan (day rate)"
                      className="input !py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="label">Pay £</label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder={String(defaultRate)}
                      className="input !py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Add extra worker"
                    className="btn-secondary !py-2 !px-2.5 !text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-dashed border-stone-200 bg-stone-50 px-4 py-2.5">
              <span className="eyebrow">
                {crewCosts > 0 ? "Profit" : "Takings"}
              </span>
              <span className="ledger text-sm font-bold text-brand-900">
                {crewCosts > 0 ? (
                  <>
                    <span
                      className={
                        crewProfit >= 0 ? "text-brand-900" : "text-clay-600"
                      }
                    >
                      {formatMoney(crewProfit, currency)}
                    </span>
                    <span className="ml-1.5 font-normal text-stone-400">
                      ({formatMoney(crewTakings, currency)} −{" "}
                      {formatMoney(crewCosts, currency)} costs)
                    </span>
                  </>
                ) : (
                  <>
                    {formatMoney(crewTakings, currency)}
                    {crewExpected > crewTakings && (
                      <span className="ml-1.5 font-normal text-stone-400">
                        / {formatMoney(crewExpected, currency)}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
