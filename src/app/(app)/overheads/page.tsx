import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDayLabel, startOfMonth, endOfMonth, toDateInput } from "@/lib/dates";
import { materializeOverheads } from "@/lib/overheads";
import { repeatLabel, type OverheadRepeat } from "@/lib/overhead-recurrence";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { CostList, type CostItem } from "@/components/CostList";
import { createOverhead, logMileage } from "@/app/actions/overheads";

export const dynamic = "force-dynamic";

const categoryLabel: Record<string, string> = {
  TOOLS: "Tools / equipment",
  FUEL: "Fuel",
  INSURANCE: "Insurance",
  VAN: "Van",
  SOFTWARE: "Software / subs",
  MILEAGE: "Mileage",
  OTHER: "Other",
};

const categoryColour: Record<string, string> = {
  TOOLS: "bg-amber-100 text-amber-700",
  FUEL: "bg-orange-100 text-orange-700",
  INSURANCE: "bg-blue-100 text-blue-700",
  VAN: "bg-purple-100 text-purple-700",
  SOFTWARE: "bg-stone-200 text-stone-700",
  MILEAGE: "bg-teal-100 text-teal-700",
  OTHER: "bg-stone-100 text-stone-600",
};

export default async function OverheadsPage() {
  const now = new Date();
  await materializeOverheads(now);
  const overheads = await prisma.overhead.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  const monthTotal = overheads
    .filter((o) => o.date >= startOfMonth(now) && o.date <= endOfMonth(now))
    .reduce((s, o) => s + o.amount, 0);
  const yearTotal = overheads
    .filter((o) => o.date.getFullYear() === now.getFullYear())
    .reduce((s, o) => s + o.amount, 0);

  const items: CostItem[] = overheads.map((o) => ({
    id: o.id,
    dateInput: toDateInput(o.date),
    dateLabel: formatDayLabel(o.date),
    category: o.category,
    description: o.description,
    amount: o.amount,
    recurrence: o.recurrence as OverheadRepeat,
    isCopy: o.recurringSourceId != null,
  }));

  return (
    <div>
      <PageHeader
        title="Overheads"
        subtitle="General running costs not tied to one job — tools, fuel, insurance, van, subs."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <StatCard label="This month" value={formatMoney(monthTotal)} tone="negative" />
        <StatCard label="This year" value={formatMoney(yearTotal)} tone="negative" />
      </div>

      <div className="mb-4">
        <Collapsible label="Add an overhead">
          <form action={createOverhead} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select name="category" className="input" defaultValue="TOOLS">
                {Object.entries(categoryLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount (£)</label>
              <input name="amount" type="number" step="0.01" inputMode="decimal" className="input" placeholder="0.00" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input name="description" className="input" placeholder="e.g. New weeding tool, diesel, PLI premium" />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" defaultValue={toDateInput(now)} className="input" />
            </div>
            <div>
              <label className="label">Repeats</label>
              <select name="recurrence" className="input" defaultValue="NONE">
                {Object.entries(repeatLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-stone-500 sm:col-span-2">
              A repeating cost logs itself again every week, month or year from
              that date, so insurance and subscriptions land in the right month
              without you adding them.
            </p>
            <div className="flex items-end sm:col-span-2">
              <button className="btn-primary">Add overhead</button>
            </div>
          </form>
        </Collapsible>
      </div>

      <div className="mb-4">
        <Collapsible label="Log mileage (45p/mile)">
          <form action={logMileage} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Miles</label>
              <input
                name="miles"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                className="input"
                placeholder="e.g. 26"
                required
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" defaultValue={toDateInput(now)} className="input" />
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <input name="note" className="input" placeholder="e.g. tip runs" />
            </div>
            <div className="sm:col-span-3">
              <button className="btn-primary">Log mileage</button>
            </div>
          </form>
        </Collapsible>
      </div>

      {overheads.length === 0 ? (
        <EmptyState title="No overheads logged" hint="Add your running costs to see true profit." />
      ) : (
        <CostList
          items={items}
          categories={categoryLabel}
          categoryColour={categoryColour}
        />
      )}
    </div>
  );
}
