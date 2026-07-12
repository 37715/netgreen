"use client";

import { useState } from "react";
import { bumpDay } from "@/app/actions/jobs";
import { CloudRainIcon } from "@/components/icons";

/** Move all remaining (not done) jobs on this day to another date. */
export function RainBump({
  date,
  nextDate,
  remaining,
}: {
  date: string;
  nextDate: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(nextDate);

  if (remaining === 0) return null;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
          <CloudRainIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <div className="text-sm font-semibold text-stone-800">Rained off?</div>
          <div className="text-xs text-stone-500">
            Move the {remaining} remaining {remaining === 1 ? "job" : "jobs"} to another day.
          </div>
        </div>
      </div>

      {open ? (
        <form action={bumpDay} className="flex items-center gap-2">
          <input type="hidden" name="from" value={date} />
          <input
            name="to"
            type="date"
            value={to}
            min={date}
            onChange={(e) => setTo(e.target.value)}
            className="input !w-auto !py-1.5 text-sm"
          />
          <button type="submit" className="btn-primary !py-2 !text-sm">
            Move jobs
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-ghost !py-2 !text-sm"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-secondary !py-2 !text-sm"
        >
          Bump the day
        </button>
      )}
    </div>
  );
}
