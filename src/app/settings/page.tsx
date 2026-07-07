import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import {
  updateSettings,
  createCrew,
  updateCrew,
  setCrewActive,
} from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, crews] = await Promise.all([
    getSettings(),
    prisma.crew.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Business details and crews." />

      <div className="card p-5">
        <h2 className="text-sm font-bold text-stone-800 mb-3">Business</h2>
        <form action={updateSettings} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Business name</label>
            <input name="businessName" defaultValue={settings.businessName} className="input" />
          </div>
          <div>
            <label className="label">Default employee rate (£/hr)</label>
            <input
              name="employeeRate"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={settings.employeeRate}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="text-sm font-bold text-stone-800 mb-3">Crews</h2>
        <div className="space-y-3">
          {crews.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border border-stone-200 p-3 ${
                c.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex flex-wrap items-end gap-3">
                <form
                  action={updateCrew}
                  className="grid flex-1 gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <label className="label">Colour</label>
                    <input name="colour" type="color" defaultValue={c.colour} className="h-10 w-14 rounded-lg border border-stone-300" />
                  </div>
                  <div>
                    <label className="label">Name</label>
                    <input name="name" defaultValue={c.name} className="input" />
                  </div>
                  <div>
                    <label className="label">Members</label>
                    <input name="members" defaultValue={c.members} className="input" placeholder="e.g. Ellis + Sam" />
                  </div>
                  <button className="btn-secondary" type="submit">Save</button>
                </form>
                <form action={setCrewActive}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="active" value={String(!c.active)} />
                  <button className="btn-ghost" type="submit">
                    {c.active ? "Archive" : "Restore"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Collapsible label="Add a crew">
            <form action={createCrew} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" placeholder="Crew 3" required />
              </div>
              <div>
                <label className="label">Members</label>
                <input name="members" className="input" placeholder="Names" />
              </div>
              <div>
                <label className="label">Colour</label>
                <input name="colour" type="color" defaultValue="#16a34a" className="h-10 w-14 rounded-lg border border-stone-300" />
              </div>
              <div className="sm:col-span-3">
                <button className="btn-primary">Add crew</button>
              </div>
            </form>
          </Collapsible>
        </div>
      </div>

      <p className="mt-6 text-xs text-stone-400">
        netgreen · local-first. Your data lives in <code>prisma/dev.db</code> on this computer.
        Back that file up to keep your records safe.
      </p>
    </div>
  );
}
