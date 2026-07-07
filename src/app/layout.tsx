import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileHeader, BottomNav } from "@/components/Nav";
import { getSettings } from "@/lib/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "netgreen",
  description: "Jobs, scheduling, costs, margins and profit for netgreen",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        <Sidebar businessName={settings.businessName} />
        <MobileHeader businessName={settings.businessName} />
        <main className="lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-12">
            {children}
          </div>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
