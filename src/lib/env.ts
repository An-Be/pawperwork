/**
 * Clerk guards the dashboard only; the intake form, landing page and reminder
 * cron are all public (spec §5, §7).
 *
 * Missing Clerk credentials must therefore NOT take down the whole app. The
 * public intake link is the product's core surface — a typo'd env var should
 * never 500 a pet owner's form or the business's SEO landing page. Instead,
 * each protected resource refuses on its own:
 *
 *   - development: treated as signed out, so public routes stay usable and
 *     the dashboard simply redirects to sign-in.
 *   - production: `assertClerkForProtectedAccess` throws, so the dashboard and
 *     authenticated APIs fail loudly and protected data stays unreachable.
 *
 * Auth never silently switches itself off: nothing behind `requireBusiness` or
 * `requireBusinessApi` is reachable when Clerk is unconfigured.
 */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

const MESSAGE =
  "Clerk is not configured: set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and " +
  "CLERK_SECRET_KEY. Public routes still work; the dashboard and " +
  "authenticated APIs are unavailable until it is set.";

/** Call only from a protected resource, never from a public route. */
export function assertClerkForProtectedAccess(): void {
  if (isClerkConfigured()) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error(MESSAGE);
  }
  console.warn(`[auth] ${MESSAGE}`);
}
