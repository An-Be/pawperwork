import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { assertClerkForProtectedAccess, isClerkConfigured } from "./env";
import type { Business as BusinessRecord } from "@/generated/prisma/client";
import { ApiAuthError } from "./api-errors";
import { assertSameOrigin } from "./csrf";

/**
 * `auth()` throws outright when clerkMiddleware has not run, which is the case
 * before credentials are provisioned. In development treat that as signed out,
 * so the dashboard redirects to sign-in and authenticated APIs return 401
 * instead of a confusing 500. In production it raises a clear error — see
 * src/lib/env.ts for why that lives here and not in the proxy.
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
 * MVP has a single login per business (spec §4: no multi-staff roles), so the
 * Clerk user id maps 1:1 to a Business row. Every dashboard read and every
 * authenticated API route scopes its queries by the resolved business id —
 * that scoping is what keeps one business out of another's records.
 */
export type Business = BusinessRecord;

/**
 * For server components. Sends a signed-out user to sign-in, and a signed-in
 * user with no business row to onboarding.
 */
export async function requireBusiness(): Promise<Business> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  const business = await prisma.business.findUnique({
    where: { clerkUserId: userId },
  });
  if (!business) redirect("/onboarding");
  return business;
}

/**
 * For route handlers: never redirects, always a status code.
 *
 * Takes the request so it can enforce the CSRF guard before anything else —
 * every authenticated mutating route goes through here, so this is the one
 * place that check needs to live. GET handlers are unaffected: the guard is a
 * no-op for safe methods (see src/lib/csrf.ts).
 */
export async function requireBusinessApi(request: Request): Promise<Business> {
  assertSameOrigin(request);
  const userId = await currentUserId();
  if (!userId) throw new ApiAuthError(401, "Not signed in");
  const business = await prisma.business.findUnique({
    where: { clerkUserId: userId },
  });
  if (!business) throw new ApiAuthError(404, "No business configured");
  return business;
}
