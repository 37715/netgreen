"use client";

import { useState } from "react";

type Crew = { id: number; name: string };

export type CustomerDefaults = {
  id?: number;
  name?: string;
  contact?: string;
  address?: string;
  notes?: string;
  recurrence?: "NONE" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  recurrenceAnchor?: string;
  defaultPrice?: number | null;
  typicalMinutes?: number | null;
  defaultCrewId?: number | null;
};

export function CustomerForm({
  action,
  crews,
  defaults = {},
  submitLabel = "Save customer",
}: {
  action: (formData: FormData) => void | Promise<void>;
  crews: Crew[];
  defaults?: CustomerDefaults;
  submitLabel?: string;
}) {
  const [recurrence, setRecurrence] = useState(defaults.recurrence ?? "NONE");

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {defaults.id != null && (
        <input type="hidden" name="id" value={defaults.id} />
      )}

      <div className="sm:col-span-2">
        <label className="label">Name</label>
        <input
          name="name"
          defaultValue={defaults.name}
          placeholder="e.g. Mrs Jenkins"
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Contact</label>
        <input
          name="contact"
          defaultValue={defaults.contact}
          placeholder="Phone or email"
          className="input"
        />
      </div>

      <div>
        <label className="label">Address</label>
        <input
          name="address"
          defaultValue={defaults.address}
          placeholder="Address / area"
          className="input"
        />
      </div>

      <div>
        <label className="label">Repeat schedule</label>
        <select
          name="recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
          className="input"
        >
          <option value="NONE">One-off / no repeat</option>
          <option value="WEEKLY">Every week</option>
          <option value="FORTNIGHTLY">Every 2 weeks</option>
          <option value="MONTHLY">Every month</option>
        </select>
      </div>

      <div>
        <label className="label">
          {recurrence === "NONE" ? "First visit (optional)" : "Next / first visit"}
        </label>
        <input
          name="recurrenceAnchor"
          type="date"
          defaultValue={defaults.recurrenceAnchor}
          className="input"
          disabled={recurrence === "NONE"}
        />
      </div>

      <div>
        <label className="label">Usual price (£)</label>
        <input
          name="defaultPrice"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={defaults.defaultPrice ?? ""}
          placeholder="e.g. 30"
          className="input"
        />
      </div>

      <div>
        <label className="label">Typical time on site (mins)</label>
        <input
          name="typicalMinutes"
          type="number"
          step="5"
          min="0"
          inputMode="numeric"
          defaultValue={defaults.typicalMinutes ?? ""}
          placeholder="e.g. 45"
          className="input"
        />
      </div>

      <div>
        <label className="label">Usual crew</label>
        <select
          name="defaultCrewId"
          defaultValue={defaults.defaultCrewId ?? ""}
          className="input"
        >
          <option value="">No default</option>
          {crews.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          rows={2}
          placeholder="Gate code, dog, where the bins go..."
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
