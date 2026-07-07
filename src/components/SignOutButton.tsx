import { signOutAction } from "@/app/actions/auth";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={`text-sm font-medium text-stone-500 hover:text-stone-800 ${className}`}
      >
        Sign out
      </button>
    </form>
  );
}
