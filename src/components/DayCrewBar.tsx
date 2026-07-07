"use client";

import { useState } from "react";
import { addCrewToDay, removeCrewFromDay } from "@/app/actions/day-crews";
import { PlusIcon } from "@/components/icons";

type Crew = { id: number; name: string; colour: string; members: string };

export function DayCrewBar({
  date,
  crews,
  available,
}: {
  date: string;
  crews: Crew[];
  available: Crew[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Crews out today</div>
          <p className="mt-0.5 text-xs text-stone-500">
            {crews.length === 0
              ? "No crews on this day yet — add who’s working."
              : `${crews.length} ${crews.length === 1 ? "crew" : "crews"} on the run sheet`}
          </p>
        </div>
        {available.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="btn-secondary !py-2 !text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add crew
            </button>
            {open && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                  {available.map((c) => (
                    <form
                      key={c.id}
                      action={async (fd) => {
                        await addCrewToDay(fd);
                        setOpen(false);
                      }}
                    >
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="crewId" value={c.id} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: c.colour }}
                        />
                        {c.name}
                      </button>
                    </form>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {crews.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {crews.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 pl-3 pr-1.5 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: c.colour }}
              />
              <div className="text-sm">
                <span className="font-semibold text-stone-800">{c.name}</span>
                {c.members && (
                  <span className="ml-1.5 text-xs text-stone-400">{c.members}</span>
                )}
              </div>
              <form action={removeCrewFromDay}>
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="crewId" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${c.name} from today`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-clay-600"
                >
                  ×
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : available.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((c) => (
            <form key={c.id} action={addCrewToDay}>
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="crewId" value={c.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:border-brand-400 hover:bg-brand-50"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c.colour }}
                />
                {c.name}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-500">
          Add crews in <span className="font-semibold">Setup</span> first, then pick who’s out today.
        </p>
      )}
    </div>
  );
}
