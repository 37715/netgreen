import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Lead tracker · netgreen",
  description: "Track gardening enquiries, quotes and follow-ups.",
};

export default function LeadsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
