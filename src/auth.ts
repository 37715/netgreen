import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Auth is on when configured. Set AUTH_DISABLED=true only for local dev without OAuth. */
export function isAuthEnabled(): boolean {
  if (process.env.AUTH_DISABLED === "true") return false;
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET &&
      process.env.ALLOWED_EMAILS
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth: session }) {
      if (!isAuthEnabled()) return true;
      return !!session?.user;
    },
    async signIn({ account, profile }) {
      if (!isAuthEnabled()) return true;
      if (account?.provider !== "google") return false;

      const email = profile?.email?.toLowerCase();
      if (!email || !profile?.email_verified) return false;

      const allowed = allowedEmails();
      if (!allowed.has(email)) {
        console.warn(`[auth] blocked sign-in: ${email}`);
        return false;
      }
      return true;
    },
  },
});
