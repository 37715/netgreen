"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ProjectIcon,
  LeadsIcon,
  ChartIcon,
  ReceiptIcon,
  SettingsIcon,
  ToolsIcon,
  LeafIcon,
} from "@/components/icons";

type NavLink = {
  href: string;
  label: string;
  Icon: typeof CalendarIcon;
  exact?: boolean;
  also?: string[];
};

const jobs: NavLink = { href: "/calendar", label: "Jobs", Icon: CalendarIcon, also: ["/paid"] };
const rounds: NavLink = { href: "/customers", label: "Rounds", Icon: UsersIcon };
const setup: NavLink = { href: "/settings", label: "Setup", Icon: SettingsIcon };

const toolLinks: NavLink[] = [
  { href: "/leads", label: "Lead tracker", Icon: LeadsIcon },
  { href: "/marketing", label: "Marketing", Icon: ChartIcon },
  { href: "/projects", label: "Projects", Icon: ProjectIcon },
  { href: "/overheads", label: "Costs", Icon: ReceiptIcon },
  { href: "/", label: "Money", Icon: HomeIcon, exact: true, also: ["/revenue-share"] },
];

const tools: NavLink = {
  href: "/tools",
  label: "Tools",
  Icon: ToolsIcon,
  also: ["/leads", "/marketing", "/projects", "/overheads", "/revenue-share"],
};

function isActive(pathname: string, link: NavLink): boolean {
  const match = (path: string) =>
    link.exact && path === link.href
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/");
  if (link.href === "/" && !link.also) return pathname === "/";
  if (link.exact) {
    return pathname === link.href || (link.also?.some((path) => match(path)) ?? false);
  }
  return match(link.href) || (link.also?.some((path) => match(path)) ?? false);
}

function toolsTabActive(pathname: string): boolean {
  if (pathname === "/") return true;
  return isActive(pathname, tools);
}

function Wordmark({ businessName }: { businessName: string }) {
  return (
    <Link href="/calendar" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-lime-400">
        <LeafIcon className="h-5 w-5" />
      </span>
      <div className="leading-none">
        <div className="font-display text-lg font-extrabold tracking-tight text-brand-900">
          netgreen<span className="text-lime-600">.</span>
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-stone-500 truncate max-w-[150px]">
          {businessName}
        </div>
      </div>
    </Link>
  );
}

function SideLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(pathname, link);
  const Icon = link.Icon;
  return (
    <Link
      href={link.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-lime-500" />
      )}
      <Icon className="h-5 w-5" />
      {link.label}
    </Link>
  );
}

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden print:hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-stone-200 bg-white">
      <div className="flex items-center px-5 h-16 border-b border-stone-100">
        <Wordmark businessName={businessName} />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <SideLink link={jobs} pathname={pathname} />
        <SideLink link={rounds} pathname={pathname} />
        <div className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-stone-400">
          Tools
        </div>
        {toolLinks.map((link) => (
          <SideLink key={link.href} link={link} pathname={pathname} />
        ))}
        <div className="pt-3">
          <SideLink link={setup} pathname={pathname} />
        </div>
      </nav>
      <div className="px-5 py-4 text-[11px] text-stone-400 border-t border-stone-100 space-y-2">
        <div>Ellis &amp; Hugo Wheeler</div>
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileHeader({ businessName }: { businessName: string }) {
  return (
    <header className="lg:hidden print:hidden sticky top-0 z-30 flex items-center px-4 h-14 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
      <Wordmark businessName={businessName} />
    </header>
  );
}

const bottomLinks: Array<NavLink & { active?: (pathname: string) => boolean }> = [
  jobs,
  { ...tools, exact: false },
  rounds,
  setup,
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
        {bottomLinks.map((link) => {
          const active = link.href === "/tools" ? toolsTabActive(pathname) : isActive(pathname, link);
          const Icon = link.Icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
                active ? "bg-brand-50 text-brand-800" : "text-stone-500 active:bg-stone-100"
              }`}
            >
              <Icon className="h-6 w-6" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
