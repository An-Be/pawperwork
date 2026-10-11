import type { NextConfig } from "next";
import path from "node:path";

// Baseline security headers on every route. The Content-Security-Policy is NOT
// here on purpose: it is built per request with a nonce in src/proxy.ts (by
// clerkMiddleware when Clerk is configured, see src/lib/clerk-csp.ts), and a
// second CSP header would break Next's script tagging.
//
// Sign-in is email OTP only (no OAuth popups), so the template's strict
// Referrer-Policy and COOP stay as they are. If Google sign-in is ever added,
// switch to the TabMath values (docs/modules/auth-clerk.md).
const securityHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // camera=() blocks in-page camera APIs only. <input type="file" capture> still
  // opens the phone's own camera app, so vaccination record photos keep working.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Private pages and API responses: never cached by shared caches, never indexed.
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The business dashboard and its setup flow.
      { source: "/dashboard", headers: privateHeaders },
      { source: "/dashboard/:path*", headers: privateHeaders },
      { source: "/onboarding", headers: privateHeaders },
      // Intake links are handed out by the business, not meant to be found.
      { source: "/intake/:path*", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Lets you open the dev server from your phone over Wi-Fi (hostname only).
  allowedDevOrigins: ["192.168.0.*", "192.168.1.*", "10.0.0.*"],
};

export default nextConfig;
