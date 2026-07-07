"use client";

type Customer = { id: number; name: string };

export type ProjectDefaults = {
  id?: number;
  title?: string;
  status?: "QUOTE" | "ACTIVE" | "DONE" | "PAID";
  quotedPrice?: number;
  startDate?: string;
  customerId?: number | null;
  notes?: string;
};

export function ProjectForm({
  action,
  customers,
  defaults = {},
  submitLabel = "Create project",
}: {
  action: (formData: FormData) => void | Promise<void>;
  customers: Customer[];
  defaults?: ProjectDefaults;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {defaults.id != null && (
        <input type="hidden" name="id" value={defaults.id} />
      )}

      <div className="sm:col-span-2">
        <label className="label">Project title</label>
        <input
          name="title"
          defaultValue={defaults.title}
          placeholder="e.g. 20m² Indian sandstone patio — Mr Smith"
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Customer</label>
        <select name="customerId" defaultValue={defaults.customerId ?? ""} className="input">
          <option value="">No customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Status</label>
        <select name="status" defaultValue={defaults.status ?? "ACTIVE"} className="input">
          <option value="QUOTE">Quote</option>
          <option value="ACTIVE">Active</option>
          <option value="DONE">Done</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <div>
        <label className="label">Quoted price (£)</label>
        <input
          name="quotedPrice"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={defaults.quotedPrice ?? ""}
          placeholder="What you quoted the customer"
          className="input"
        />
      </div>

      <div>
        <label className="label">Start date</label>
        <input
          name="startDate"
          type="date"
          defaultValue={defaults.startDate}
          className="input"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          rows={2}
          placeholder="Scope, materials spec, anything to remember..."
          className="input"
        />
      </div>

      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
