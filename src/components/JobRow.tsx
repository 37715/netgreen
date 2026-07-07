import { setJobStatus, moveJob, deleteJob } from "@/app/actions/jobs";
import { InlinePrice } from "@/components/InlinePrice";
import { formatHourlyBreakdown } from "@/lib/money";
import {
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@/components/icons";

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
};

export function JobRow({
  job,
  isFirst,
  isLast,
}: {
  job: JobRowData;
  isFirst: boolean;
  isLast: boolean;
}) {
  const done = job.status === "DONE";
  return (
    <div className="flex items-center gap-3 py-2.5">
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

      <InlinePrice id={job.id} price={job.price} />

      <div className="flex shrink-0 items-center text-stone-300">
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
  );
}
