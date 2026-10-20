// Next.js 16 renamed middleware.ts to proxy.ts.
// Preserve Netgreen's existing Google OAuth/allowlist protection everywhere
// except explicitly listed API endpoints, which validate their own secrets.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|api/integrations/ehw-leads|api/cron/marketing|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
