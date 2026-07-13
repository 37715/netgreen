import { rainOffDay } from "@/app/actions/jobs";
import { CloudRainIcon } from "@/components/icons";

/** Mark all remaining (not done) jobs on this day as skipped. */
export function RainBump({
  date,
  remaining,
}: {
  date: string;
  remaining: number;
}) {
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
            Skip the {remaining} remaining {remaining === 1 ? "job" : "jobs"} and
            close the day.
          </div>
        </div>
      </div>

      <form action={rainOffDay}>
        <input type="hidden" name="from" value={date} />
        <button type="submit" className="btn-secondary !py-2 !text-sm">
          Rained off
        </button>
      </form>
    </div>
  );
}
