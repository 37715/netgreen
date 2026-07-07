import { Sidebar, MobileHeader, BottomNav } from "@/components/Nav";
import { getSettings } from "@/lib/settings";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <>
      <Sidebar businessName={settings.businessName} />
      <MobileHeader businessName={settings.businessName} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-12">
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
