import { posthogCsp } from "@/lib/analytics";
import { mergeDirectives, type CspDirectives } from "@/lib/csp";

// Pawperwork's additions to the shared CSP (src/lib/csp.ts). Clerk's own
// origins are added by clerkMiddleware (src/lib/clerk-csp.ts), so they aren't listed.
export const cspAllowlist: CspDirectives = mergeDirectives(
  {
    // Uploadthing: the browser PUTs the vaccination record straight to an
    // ingest host, then the stored file is served from ufs.sh (utfs.io is the
    // legacy host).
    "connect-src": [
      "https://*.ingest.uploadthing.com",
      "https://api.uploadthing.com",
      "https://*.ufs.sh",
      "https://utfs.io",
    ],
    // Business logos are an arbitrary https URL the business pastes into
    // settings (shown on its intake form), so img-src can't be an allowlist of
    // hosts. Images can't run code; scripts stay nonce-only.
    "img-src": ["https:"],
  },
  // PostHog ingest + remote config, and its lazy-loaded scripts (src/lib/analytics.ts).
  posthogCsp(process.env.NEXT_PUBLIC_POSTHOG_HOST),
);
