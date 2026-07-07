"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ProjectIcon,
  ReceiptIcon,
  SettingsIcon,
  LeafIcon,
} from "@/components/icons";

const links = [
  { href: "/calendar", label: "Today", Icon: CalendarIcon },
  { href: "/", label: "Money", Icon: HomeIcon, exact: true },
  { href: "/projects", label: "Projects", Icon: ProjectIcon },
  { href: "/overheads", label: "Costs", Icon: ReceiptIcon },
  { href: "/customers", label: "Rounds", Icon: UsersIcon },
  { href: "/settings", label: "Setup", Icon: SettingsIcon },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Wordmark({ businessName }: { businessName: string }) {
  return (
    <Link href="/calendar" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-lime-400">
        <LeafIcon className="h-5 w-5" />
      </span>
      <div className="leading-none">
        <div className="font-display text-lg font-extrabold tracking-tight text-brand-900">
          EHW<span className="text-lime-600">.</span>
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-stone-500 truncate max-w-[150px]">
          {businessName}
        </div>
      </div>
    </Link>
  );
}

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-stone-200 bg-white">
      <div className="flex items-center px-5 h-16 border-b border-stone-100">
        <Wordmark businessName={businessName} />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -transtone-y-1/2 rounded-r-full bg-lime-500" />
              )}
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-stone-400 border-t border-stone-100">
        Ellis &amp; Hugo Wheeler
      </div>
    </aside>
  );
}

export function MobileHeader({ businessName }: { businessName: string }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center px-4 h-14 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
      <Wordmark businessName={businessName} />
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-6 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {links.map(({ href, label, Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold ${
              active ? "text-brand-800" : "text-stone-500"
            }`}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-lime-500" />
            )}
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
