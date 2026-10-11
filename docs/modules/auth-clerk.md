# Module: accounts with Clerk + guest sessions

Use when someone needs to come back to their things (an organizer dashboard),
while the people they share with still never log in.

**Reference implementation:** TabMath (`github.com/An-Be/tab-math`).

## Files to bring over

| From TabMath | What it does |
| --- | --- |
| `src/proxy.ts` | `clerkMiddleware` + guest cookie + guest → account merge on sign-in |
| `src/lib/clerk-csp.ts` | Builds the CSP through Clerk (Clerk owns the nonce), from the shared defaults + `src/config/csp.ts` |
| `src/lib/server/get-current-actor.ts` | The only place that answers "who is asking": Clerk first, guest cookie second |
| `src/lib/guest-session.ts` | Cookie and header names |
| `src/app/clerk-theme.css` | Maps Clerk's shadcn theme variables onto the monochrome tokens |
| `src/app/layout.tsx` | `ClerkProvider dynamic` + sign-in/up buttons in the header |
| `src/app/sign-in`, `src/app/sign-up` | Clerk pages |

Add a `User` model (`id` = Clerk id or guest id, `isGuest`) and an owner check
like `requireSplitOwner` for every resource route.

## Rules

- Authorization is per resource, never path based. Shared/public pages must keep
  working with no session; never require auth for them in the proxy.
- Rate limit by IP, not actor id (guests get a fresh id by clearing cookies).
- Keep the CSP report-only until `[csp]` logs are quiet across sign-in, then enforce.
- Clerk + Google OAuth needs `Referrer-Policy: strict-origin-when-cross-origin`
  and COOP `same-origin-allow-popups` in `next.config.ts` (document both).
- Production Clerk needs its custom domain CNAMEs; a `/__clerk/npm/...` 404 is DNS.

## Packages

`@clerk/nextjs`, `@clerk/ui`. Env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, sign-in/up URLs.
