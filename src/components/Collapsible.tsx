"use client";

import { useState } from "react";
import { PlusIcon, ChevronUpIcon } from "@/components/icons";

export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronUpIcon className="h-4 w-4 text-stone-400" />
          ) : (
            <PlusIcon className="h-4 w-4 text-brand-600" />
          )}
          {label}
        </span>
      </button>
      {open && <div className="border-t border-stone-100 p-4">{children}</div>}
    </div>
  );
}
