"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, LeadsIcon, PlusIcon } from "@/components/icons";

export function LeadTrackerNav() {
  const pathname = usePathname();
  const isNew = pathname === "/leads/new";
  const isPipeline = pathname === "/leads" || /^\/leads\/\d+$/.test(pathname);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-brand-700 bg-brand-900 text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/leads" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-brand-900">
              <LeadsIcon className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <div className="font-display text-lg font-extrabold tracking-tight">
                Lead tracker
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200">
                netgreen sales
              </div>
            </div>
          </Link>
          <Link
            href="/calendar"
            className="hidden rounded-xl border border-brand-600 px-3 py-2 text-xs font-bold text-brand-100 hover:bg-brand-800 sm:inline-flex"
          >
            Back to jobs
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-2">
          <LeadNavItem
            href="/leads"
            label="Pipeline"
            active={isPipeline}
            icon={<LeadsIcon className="h-6 w-6" />}
          />
          <LeadNavItem
            href="/leads/new"
            label="Add lead"
            active={isNew}
            icon={<PlusIcon className="h-6 w-6" />}
            primary
          />
          <LeadNavItem
            href="/calendar"
            label="Main app"
            active={false}
            icon={<HomeIcon className="h-6 w-6" />}
          />
        </div>
      </nav>
    </>
  );
}

function LeadNavItem({
  href,
  label,
  active,
  icon,
  primary = false,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors ${
        primary
          ? active
            ? "bg-lime-400 text-brand-900"
            : "bg-brand-800 text-white"
          : active
            ? "bg-brand-50 text-brand-800"
            : "text-stone-500 hover:bg-stone-100"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
