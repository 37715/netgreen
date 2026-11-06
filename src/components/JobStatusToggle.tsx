"use client";

import { setJobStatus } from "@/app/actions/jobs";
import { CheckIcon } from "@/components/icons";
import type { JobStatusValue } from "@/lib/job-status";
import { useFormStatus } from "react-dom";

function ToggleButton({
  done,
  compact,
}: {
  done: boolean;
  compact: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={done ? "Mark not done" : "Mark done"}
      aria-busy={pending}
      className={`flex items-center justify-center border-2 transition-colors disabled:cursor-wait disabled:opacity-50 ${
        compact ? "h-11 w-11 rounded-lg" : "h-11 w-11 rounded-xl"
      } ${
        done
          ? "border-lime-500 bg-lime-500 text-white"
          : "border-stone-300 text-transparent hover:border-lime-500 active:bg-lime-100"
      }`}
    >
      <CheckIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
    </button>
  );
}

export function JobStatusToggle({
  id,
  status,
  statusVersion,
  compact = false,
}: {
  id: number;
  status: JobStatusValue;
  statusVersion: number;
  compact?: boolean;
}) {
  const done = status === "DONE";

  return (
    <form
      action={setJobStatus}
      className="shrink-0"
      onSubmit={(event) => {
        if (
          done &&
          !window.confirm(
            "Mark this job as not done? This will also clear its paid status."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="expectedStatus" value={status} />
      <input type="hidden" name="expectedVersion" value={statusVersion} />
      <ToggleButton done={done} compact={compact} />
    </form>
  );
}
