"use client";

import { useState } from "react";
import {
  setJobStatus,
  setJobPayment,
  updateJobNotes,
  moveJob,
  deleteJob,
} from "@/app/actions/jobs";
import { InlinePrice } from "@/components/InlinePrice";
import { formatHourlyBreakdown } from "@/lib/money";
import {
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  GripIcon,
  NoteIcon,
} from "@/components/icons";

export type CrewOption = { id: number | null; name: string; colour: string };

export type JobRowData = {
  id: number;
  title: string;
  price: number;
  status: "SCHEDULED" | "DONE" | "SKIPPED";
  pricingType?: "FIXED" | "HOURLY";
  hourlyRate?: number | null;
  hours?: number | null;
  workers?: number | null;
  customer: { id: number; name: string; address?: string } | null;
  recurringSourceCustomerId: number | null;
  paidAt?: Date | string | null;
  paymentMethod?: "CASH" | "BANK" | null;
  notes?: string;
};

export function JobRow({
  job,
  isFirst,
  isLast,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  crewOptions,
  currentCrewId,
  onAssign,
}: {
  job: JobRowData;
  isFirst: boolean;
  isLast: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (id: number) => void;
  onDragEnd?: () => void;
  crewOptions?: CrewOption[];
  currentCrewId?: number | null;
  onAssign?: (crewId: number | null) => void;
}) {
  const done = job.status === "DONE";
  const paid = !!job.paidAt;
  const [menuOpen, setMenuOpen] = useState(false);
  const [payMenuOpen, setPayMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const canAssign = !!onAssign && (crewOptions?.length ?? 0) > 0;

  return (
    <div className={`py-2.5 ${dragging ? "opacity-40" : ""}`}>
    <div className="flex items-center gap-2">
      {draggable && (
        <div className="relative shrink-0">
          <span
            draggable
            role="button"
            tabIndex={0}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(job.id));
              onDragStart?.(job.id);
            }}
            onDragEnd={() => onDragEnd?.()}
            onClick={() => canAssign && setMenuOpen((o) => !o)}
            aria-label="Drag or tap to move to another crew"
            className="flex h-9 w-5 cursor-grab items-center justify-center text-stone-300 hover:text-stone-500 active:cursor-grabbing"
          >
            <GripIcon className="h-4 w-4" />
          </span>
          {menuOpen && canAssign && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-9 z-20 min-w-[160px] rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  Move to
                </div>
                {crewOptions!.map((c) => {
                  const isCurrent = (currentCrewId ?? null) === c.id;
                  return (
                    <button
                      key={String(c.id)}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        setMenuOpen(false);
                        if (!isCurrent) onAssign!(c.id);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold ${
                        isCurrent
                          ? "text-stone-300"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: c.colour }}
                      />
                      {c.name}
                      {isCurrent && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      <form action={setJobStatus} className="shrink-0">
        <input type="hidden" name="id" value={job.id} />
        <input type="hidden" name="status" value={done ? "SCHEDULED" : "DONE"} />
        <button
          type="submit"
          aria-label={done ? "Mark not done" : "Mark done"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors ${
            done
              ? "border-lime-500 bg-lime-500 text-white"
              : "border-stone-300 text-transparent hover:border-lime-500 active:bg-lime-100"
          }`}
        >
          <CheckIcon className="h-5 w-5" />
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-semibold ${
            done ? "text-stone-400 line-through" : "text-stone-900"
          }`}
        >
          {job.title}
        </div>
        {(job.customer || job.pricingType === "HOURLY") && (
          <div className="truncate text-xs text-stone-400">
            {job.customer && (
              <>
                {job.customer.name}
                {job.customer.address && (
                  <span className="text-stone-400"> · {job.customer.address}</span>
                )}
                {job.recurringSourceCustomerId && (
                  <span className="ml-1.5 text-lime-600">· round</span>
                )}
              </>
            )}
            {job.pricingType === "HOURLY" &&
              job.workers != null &&
              job.hourlyRate != null &&
              job.hours != null && (
                <span className={job.customer ? "ml-1.5" : ""}>
                  {job.customer ? "· " : ""}
                  {formatHourlyBreakdown(job.workers, job.hourlyRate, job.hours)}
                </span>
              )}
          </div>
        )}
      </div>

      {done && job.price > 0 && (
        <div className="relative shrink-0">
          {paid ? (
            <form action={setJobPayment}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="method" value="UNPAID" />
              <button
                type="submit"
                title="Tap to mark unpaid"
                className="rounded-lg bg-lime-100 px-2 py-1 text-[11px] font-bold text-lime-600"
              >
                Paid{job.paymentMethod ? ` · ${job.paymentMethod === "CASH" ? "cash" : "bank"}` : ""}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPayMenuOpen((o) => !o)}
                className="rounded-lg bg-clay-100 px-2 py-1 text-[11px] font-bold text-clay-600"
              >
                Due
              </button>
              {payMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close"
                    onClick={() => setPayMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 flex min-w-[120px] flex-col rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                      Paid by
                    </div>
                    {(["CASH", "BANK"] as const).map((m) => (
                      <form key={m} action={setJobPayment}>
                        <input type="hidden" name="id" value={job.id} />
                        <input type="hidden" name="method" value={m} />
                        <button
                          type="submit"
                          onClick={() => setPayMenuOpen(false)}
                          className="w-full px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          {m === "CASH" ? "Cash" : "Bank transfer"}
                        </button>
                      </form>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <InlinePrice id={job.id} price={job.price} />

      <div className="flex shrink-0 items-center text-stone-300">
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          aria-label="Visit notes"
          className={`flex h-7 w-6 items-center justify-center rounded hover:bg-stone-100 ${
            job.notes ? "text-lime-600 hover:text-lime-600" : "hover:text-stone-600"
          }`}
        >
          <NoteIcon className="h-4 w-4" />
        </button>
        <form action={moveJob}>
          <input type="hidden" name="id" value={job.id} />
          <input type="hidden" name="dir" value="up" />
          <button
            type="submit"
            disabled={isFirst}
            aria-label="Move up"
            className="flex h-7 w-6 items-center justify-center rounded hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
        </form>
        <form action={moveJob}>
          <input type="hidden" name="id" value={job.id} />
          <input type="hidden" name="dir" value="down" />
          <button
            type="submit"
            disabled={isLast}
            aria-label="Move down"
            className="flex h-7 w-6 items-center justify-center rounded hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </form>
        <form action={deleteJob}>
          <input type="hidden" name="id" value={job.id} />
          <button
            type="submit"
            aria-label="Delete job"
            className="flex h-7 w-6 items-center justify-center rounded hover:bg-clay-100 hover:text-clay-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>

    {!notesOpen && job.notes && (
      <p className="mt-1 ml-11 truncate text-xs text-stone-400">{job.notes}</p>
    )}
    {notesOpen && (
      <form
        action={async (fd) => {
          await updateJobNotes(fd);
          setNotesOpen(false);
        }}
        className="mt-2 ml-11 flex items-end gap-2"
      >
        <input type="hidden" name="id" value={job.id} />
        <textarea
          name="notes"
          rows={2}
          defaultValue={job.notes ?? ""}
          placeholder="Gate code, what was done, anything for next visit..."
          className="input flex-1 !py-1.5 text-sm"
        />
        <button type="submit" className="btn-secondary !py-1.5 !px-3 !text-sm">
          Save
        </button>
      </form>
    )}
    </div>
  );
}
