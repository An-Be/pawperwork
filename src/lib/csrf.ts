import { ApiAuthError } from "./api-errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Origin-header CSRF guard for state-changing requests on cookie-authenticated
 * routes — the same mechanism Next.js Server Actions enforce automatically,
 * which plain Route Handlers do not get for free.
 *
 * Clerk's session lives in a cookie, so without this, a page on another
 * origin could trigger a state-changing `fetch` (e.g. edit a waiver, delete
 * a vaccination type) using the signed-in business owner's cookies — the
 * classic CSRF scenario. GET/HEAD/OPTIONS are exempt: they must stay
 * side-effect-free per HTTP semantics, so there's nothing to forge.
 *
 * Browsers send the `Origin` header on every non-GET fetch, same-origin or
 * not, so a same-origin POST from this app's own pages always has one that
 * matches. A request with no Origin and no same-origin Referer has no
 * legitimate explanation here and is rejected.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;

  const expected = new URL(request.url).origin;

  const origin = request.headers.get("origin");
  if (origin !== null) {
    if (origin !== expected) {
      throw new ApiAuthError(403, "Cross-origin request blocked");
    }
    return;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin === expected) return;
    } catch {
      // Malformed Referer — fall through to reject.
    }
  }

  throw new ApiAuthError(403, "Cross-origin request blocked");
}
