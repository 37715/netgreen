import Link from "next/link";
import { auth, isAuthEnabled } from "@/auth";
import { signInWithGoogle } from "@/app/actions/auth";
import { LeafIcon } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const authOn = isAuthEnabled();

  if (session?.user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4">
        <p className="text-sm text-stone-600">
          Signed in as <strong>{session.user.email}</strong>
        </p>
        <Link href="/calendar" className="btn-primary mt-4">
          Open calendar
        </Link>
      </div>
    );
  }

  const denied = sp.error === "AccessDenied";

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <div className="card w-full max-w-sm overflow-hidden text-center">
        <div className="relative bg-brand-800 px-8 pb-6 pt-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,181,24,0.35), transparent 70%)" }}
          />
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-lime-400 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
            <LeafIcon className="h-8 w-8" />
          </div>
          <h1 className="relative mt-4 font-display text-2xl font-extrabold text-white">
            netgreen<span className="text-lime-400">.</span>
          </h1>
          <p className="relative mt-1 text-xs text-brand-200">
            The job book, the money book, the whole business.
          </p>
        </div>
        <div className="p-8 pt-5">
        <p className="text-sm text-stone-500">
          Approved team only — one shared account for the business.
        </p>

        {!authOn ? (
          <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <p className="font-semibold">Auth not configured</p>
            <p className="mt-1 text-amber-800/80">
              Set Google OAuth env vars, or use{" "}
              <code className="text-xs">AUTH_DISABLED=true</code> for local dev.
            </p>
            <Link href="/calendar" className="btn-primary mt-4 inline-flex w-full justify-center">
              Continue (dev)
            </Link>
          </div>
        ) : (
          <>
            {denied && (
              <p className="mt-4 rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-600">
                That Google account isn&apos;t allowed. Use your approved work email.
              </p>
            )}
            <form className="mt-6" action={signInWithGoogle}>
              <button type="submit" className="btn-primary w-full justify-center">
                Sign in with Google
              </button>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
