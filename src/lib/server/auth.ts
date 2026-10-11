import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import type { Business } from "@/lib/generated/prisma/client";
import { db } from "./db";
import { assertClerkForProtectedAccess, isClerkConfigured } from "./env";
import { json } from "./http";

/**
 * `auth()` throws outright when clerkMiddleware has not run, which is the case
 * before credentials are provisioned. In development treat that as signed out,
 * so the dashboard redirects to sign-in and authenticated APIs return 401
 * instead of a confusing 500. In production it raises a clear error; see
 * src/lib/server/env.ts for why that lives here and not in the proxy.
 */
export async function currentUserId(): Promise<string | null> {
  if (!isClerkConfigured()) {
    // Throws in production, warns in development. Either way no userId is
    // produced, so no protected data is reachable.
    assertClerkForProtectedAccess();
    return null;
  }
  const { userId } = await auth();
  return userId;
}

/**
 * One login per business (no multi-staff roles yet), so the Clerk user id maps
 * 1:1 to a Business row. Every dashboard read and every authenticated API
 * route scopes its queries by the resolved business id: that scoping is what
 * keeps one business out of another's records.
 *
 * For server components. Sends a signed-out user to sign-in, and a signed-in
 * user with no business row to onboarding. The row stays on the server; pass
 * only the fields a view needs to client components.
 */
export async function requireBusiness(): Promise<Business> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  const business = await db.business.findUnique({ where: { clerkUserId: userId } });
  if (!business) redirect("/onboarding");
  return business;
}

export type BusinessApiResult = { ok: true; business: Business } | { ok: false; response: NextResponse };

/**
 * For route handlers: never redirects, always a status code. Mutating routes
 * still call `rejectCrossSite(req)` first (src/lib/server/http.ts), before
 * this: Clerk's session is a cookie, so the CSRF guard has to come first.
 */
export async function requireBusinessApi(): Promise<BusinessApiResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, response: json({ error: "Not signed in" }, 401) };
  const business = await db.business.findUnique({ where: { clerkUserId: userId } });
  if (!business) return { ok: false, response: json({ error: "No business configured" }, 404) };
  return { ok: true, business };
}
