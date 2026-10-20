"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";

const toolPrefixes = [
  "/leads",
  "/marketing",
  "/projects",
  "/overheads",
  "/customers",
  "/revenue-share",
  "/invoices",
];

export function isToolPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (/^\/paid\/[^/]+\/invoice$/.test(pathname)) return true;
  return toolPrefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function ToolsBack() {
  const pathname = usePathname();
  if (pathname === "/tools" || !isToolPath(pathname)) return null;

  return (
    <Link
      href="/tools"
      className="print:hidden mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Tools
    </Link>
  );
}
