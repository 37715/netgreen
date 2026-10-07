export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
  // Protect all routes except login, auth API, static assets, and PWA files
  // (the manifest and icons must load before sign-in for install to work).
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
