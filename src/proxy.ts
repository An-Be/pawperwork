import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isClerkConfigured } from "@/lib/env";

/**
 * Next 16 renamed the `middleware` convention to `proxy` (Node-only runtime,
 * not configurable). Clerk's `clerkMiddleware` works unchanged as its default
 * export, and is what makes `auth()` available downstream.
 *
 * It deliberately does NOT do path-based route protection. Clerk now
 * deprecates `createRouteMatcher` because matcher patterns can drift from how
 * Next actually routes a request, leaving protected data reachable. Every
 * protected resource authorises itself instead — `requireBusiness()` in
 * dashboard pages and `requireBusinessApi()` in authenticated route handlers —
 * and both scope their queries to the signed-in business.
 *
 * When Clerk is unconfigured this passes requests straight through rather than
 * throwing. Throwing here would 500 the public intake form, the landing page
 * and the reminder cron, none of which use Clerk. The protected resources
 * still refuse on their own — see src/lib/env.ts.
 */
const withClerk = clerkMiddleware();

export function proxy(request: NextRequest, event: never) {
  if (!isClerkConfigured()) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    // Skip Next internals and static assets so nothing blocks CSS/JS/images.
    "/((?!_next|.*\\.[\\w]+$).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path. Required, and must come after the API matcher.
    "/__clerk/:path*",
  ],
};
