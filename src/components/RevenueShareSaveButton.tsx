"use client";

import { useFormStatus } from "react-dom";

export function RevenueShareSaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-secondary min-h-11 !px-3 !py-2 !text-xs disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
