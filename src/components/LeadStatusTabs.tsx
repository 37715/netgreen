"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  LEAD_STATUSES,
  leadStatusLabels,
  type LeadStatusValue,
} from "@/lib/leads";

export function LeadStatusTabs({
  active,
  total,
  counts,
}: {
  active: LeadStatusValue | null;
  total: number;
  counts: Record<LeadStatusValue, number>;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  return (
    <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <StatusTab
        href="/leads"
        label="All"
        count={total}
        active={!active}
        activeRef={!active ? activeRef : undefined}
      />
      {LEAD_STATUSES.map((status) => (
        <StatusTab
          key={status}
          href={`/leads?status=${status}`}
          label={leadStatusLabels[status]}
          count={counts[status]}
          active={active === status}
          activeRef={active === status ? activeRef : undefined}
        />
      ))}
    </div>
  );
}

function StatusTab({
  href,
  label,
  count,
  active,
  activeRef,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  activeRef?: React.RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <Link
      ref={activeRef}
      href={href}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      {label}
      <span className={active ? "text-brand-200" : "text-stone-400"}>{count}</span>
    </Link>
  );
}
