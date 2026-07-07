"use client";

import { useRef } from "react";
import { updateJobPrice } from "@/app/actions/jobs";

export function InlinePrice({
  id,
  price,
}: {
  id: number;
  price: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateJobPrice} className="flex items-center">
      <input type="hidden" name="id" value={id} />
      <span className="ledger text-sm text-stone-400">£</span>
      <input
        name="price"
        type="number"
        step="0.01"
        inputMode="decimal"
        defaultValue={price ? price.toFixed(2) : ""}
        placeholder="0"
        onBlur={(e) => {
          const next = parseFloat(e.target.value || "0");
          if (next !== price) formRef.current?.requestSubmit();
        }}
        className="ledger w-16 rounded-lg border border-transparent bg-transparent px-1 py-1 text-right text-sm font-semibold text-stone-800 hover:border-stone-200 focus:border-brand-500 focus:bg-white outline-none"
      />
    </form>
  );
}
