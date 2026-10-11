import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { cspAllowlist } from "@/config/csp";
import { contentSecurityPolicy } from "@/lib/clerk-csp";
import { buildCsp, newNonce } from "@/lib/csp";
import { isClerkConfigured } from "@/lib/server/env";

// Next 16 renamed middleware.ts to proxy.ts. Runs on the Node runtime.
//
// Two jobs: make Clerk's auth() available downstream, and set the per-request
// nonce Content-Security-Policy. With Clerk configured, clerkMiddleware does
// both (it owns the nonce; see src/lib/clerk-csp.ts). Without Clerk keys the
// public intake form, landing page and reminder cron must keep working, so
// requests pass through with the template's own nonce CSP instead of throwing.
//
// It deliberately does NOT do path-based route protection: every protected
// resource authorizes itself (requireBusiness / requireBusinessApi in
// src/lib/server/auth.ts) and scopes its queries to the signed-in business.
//
// This must stay the ONLY Content-Security-Policy header on the response.
const withClerk = clerkMiddleware({ contentSecurityPolicy });

function withTemplateCsp(request: NextRequest) {
  const nonce = newNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development", cspAllowlist);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isClerkConfigured()) return withClerk(request, event);
  return withTemplateCsp(request);
}

export const config = {
  matcher: [
    // Skip Next internals and static files so nothing blocks CSS/JS/images.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path. Must come after the API matcher.
    "/__clerk/(.*)",
  ],
};
