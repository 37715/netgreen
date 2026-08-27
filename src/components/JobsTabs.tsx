"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Two big toggles at the top of the Jobs tab:
 *  - Work: tick off what's been done (operational, no money).
 *  - Paid: record who's paid and how (money in).
 * They're two separate purposes sharing one tab.
 */
export function JobsTabs({ date }: { date?: string }) {
  const pathname = usePathname();
  const onPaid = pathname.startsWith("/paid");
  const dateQ = date ? `date=${date}` : "";

  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      <Segment
        href={`/calendar?view=day${dateQ ? `&${dateQ}` : ""}`}
        active={!onPaid}
        title="Work"
        subtitle="tick off what's done"
      />
      <Segment
        href={`/paid${dateQ ? `?${dateQ}` : ""}`}
        active={onPaid}
        title="Paid"
        subtitle="who's paid & how"
      />
    </div>
  );
}

function Segment({
  href,
  active,
  title,
  subtitle,
}: {
  href: string;
  active: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-2xl border px-4 py-3 text-center transition-colors ${
        active
          ? "border-brand-700 bg-brand-700 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]"
          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
      }`}
    >
      <div className="font-display text-base font-extrabold">{title}</div>
      <div
        className={`text-[11px] font-semibold ${
          active ? "text-brand-100" : "text-stone-400"
        }`}
      >
        {subtitle}
      </div>
    </Link>
  );
}
