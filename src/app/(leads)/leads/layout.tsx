import type { Metadata } from "next";
import { LeadTrackerNav } from "@/components/LeadTrackerNav";

export const metadata: Metadata = {
  title: "Lead tracker · netgreen",
  description: "Track gardening enquiries, quotes and follow-ups.",
};

export default function LeadsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-50">
      <LeadTrackerNav />
      <main className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-7">
        {children}
      </main>
    </div>
  );
}
