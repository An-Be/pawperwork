<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> **Everything below is project-owned and must stay OUTSIDE the markers above.**
> `next dev` replaces everything between `BEGIN:nextjs-agent-rules` and
> `END:nextjs-agent-rules` whenever it doesn't match. Text before and after is kept.

# Project rules

This repo follows **tool-template** (github.com/An-Be/tool-template), the shared
base for Andrea's tiny tools. Tool-specific context goes in the "This tool"
section at the bottom; everything above it is shared and should stay in sync
with the template.

## Never commit or push without asking

Do not run `git commit` or `git push` on your own initiative, even for a small,
verified fix. Make the change, verify it, say what you'd commit, and ask. Every
time. A push to `main` deploys to production on Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack, RSC by default), **React 19**, **TypeScript 5** strict
- **Tailwind CSS 4**, CSS-first: tokens live in `src/app/globals.css` under `@theme`. No `tailwind.config`.
- **Hand-rolled UI primitives** in `src/components/ui/` (no shadcn, no Base UI). `cn()` from `src/lib/utils.ts`, variants with `cva`.
- **Postgres on Neon** + **Prisma 7** with `@prisma/adapter-pg`
- **Zod 4** for every external input
- **Vitest** for pure logic
- **Vercel**, region `cle1` (next to Neon `aws-us-east-2`)

### Version rules that override older training data

- `middleware.ts` is **`src/proxy.ts`** in Next 16. Node runtime only.
- `params`, `searchParams`, `cookies()` and `headers()` are **async**. `await` them.
- Page props are typed with the generated global `PageProps<"/route/[param]">`
  (run `next typegen`, which `npm run typecheck` does).
- Prisma 7: generator is `prisma-client` (not `prisma-client-js`), output
  `src/lib/generated/prisma` (gitignored). Import from
  `@/lib/generated/prisma/client`, **never** `@prisma/client`. The datasource URL
  is in `prisma.config.ts`, not `schema.prisma`. A driver adapter is mandatory
  (`src/lib/server/db.ts`).

## Layout

```
src/app/                 routes; Server Components fetch, client components render
src/app/api/             route handlers
src/components/ui/       hand-rolled primitives (Button, Input, Field, Dialog, Switch, Toast, CopyField, SectionLabel, Shell)
src/components/site/     header, footer, mark
src/components/<feature>/ feature components
src/config/              site.ts (name, copy), csp.ts (CSP allowlist), routes.ts (secret path prefixes)
src/lib/                 pure logic, no JSX; safe on client and server
src/lib/server/          server-only modules (each imports "server-only")
src/proxy.ts             per-request nonce CSP
src/instrumentation-client.ts  PostHog init (off without env vars)
prisma/                  schema, migrations, sql/app-role.sql
scripts/db-check.mjs     build-time schema drift check
```

## Security (non-negotiable)

- **No secrets on the client.** Never prefix a secret with `NEXT_PUBLIC_`. Every
  module that touches the database or a secret lives in `src/lib/server/` and
  imports `server-only`, so importing it from a client component fails the build.
- **Secret links are credentials.** Generate them with `newToken()` (128-bit,
  base62). Never use `cuid()`/`uuid()` for anything that grants access.
  Format-check with `isWellFormedToken()` before querying.
- **Every mutating route starts with `rejectCrossSite(req)`** (CSRF: Sec-Fetch-Site,
  Origin, JSON content type), then `checkRateLimit()` if the route costs anything
  (writes, AI calls, uploads), then `parseJsonBody(req, schema)`. Start new routes by copying an existing
  mutating route (in the template: `src/app/api/spaces/route.ts`).
- **Zod object schemas strip unknown keys**; that is what blocks mass assignment.
  Never use `.passthrough()` / `.loose()`.
- **Return 404, not 403**, for a resource that doesn't exist or isn't the caller's,
  so ids and tokens can't be probed.
- **Select only the fields a view needs** and pass only those across the
  server/client boundary. Never hand a whole row to a client component.
- **Secret-link pages**: add the prefix to `privateHeaders` in `next.config.ts`
  (`no-store`, `noindex`) and to `secretPathPrefixes` in `src/config/routes.ts`
  (log redaction). Page titles never include user content.
- **CSP** is built per request in `src/proxy.ts` with a nonce and must stay the only
  CSP header. Add third-party origins in `src/config/csp.ts`, one comment per entry.
  Violations are logged by `/api/csp-report` (filter Vercel logs on `[csp]`).
- **No inline `style` attributes.** Production CSP is nonce-only for styles.
- **Analytics never carries a secret or a person.** Send events only through
  `track()` (`src/lib/track.ts`) with flat counts, modes and outcomes: no names,
  free text, tokens or per-person amounts. URLs are redacted by `redactEvent`
  (`src/lib/analytics.ts`) from `secretPathPrefixes`; session replay stays off
  unless a tool turns it on with full text masking. See
  `docs/modules/analytics-posthog.md`.

## Database

- The app connects as a **least-privilege role** (`prisma/sql/app-role.sql`):
  row access on app tables only, no DDL.
- **Migrations are applied by the Neon owner role**, not the app role. After a
  migration adds a table, extend the app role's grants.
- `npm run build` runs `scripts/db-check.mjs`, which fails the build if the live
  database doesn't match `schema.prisma` (required on Vercel, skipped locally
  without `DIRECT_URL`).
- A migration folder's name is its sort order. Generate new ones with
  `npx prisma migrate dev --name <name>` or, by hand,
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
  into a folder timestamped **after** the latest one.
- Concurrency: when two writers can race (two phones tapping at once), lock the
  parent row (`SELECT ... FOR UPDATE` in a transaction) or lean on a unique index.

## Code rules

- Server Components by default. `"use client"` only for state, handlers or browser APIs.
  Initial data is fetched on the server and passed down, never fetched client-side on load.
- **No default exports** except files Next or a tool requires (`page`, `layout`,
  `not-found`, `manifest`, `route` handlers are named exports, configs).
- **One component per file.** Early returns over nesting. **No `any`.**
- Client calls to our own API go through `api()` in `src/lib/api-client.ts`.
- Pure logic belongs in `src/lib/*.ts` with a `*.test.ts` next to it.
- `next/link` for internal links; plain `<a>` only for links that leave the app.
- Colors come from tokens (`ink`, `paper`, `mute`, `faint`, `wash`, and `rule` for the header hairline). Type is
  `display` (Space Grotesk) or mono; small caps text uses the `label` utility.
  Sections are numbered with `SectionLabel`.
- Inputs use 16px text on mobile so iOS doesn't zoom.

## Validating changes

A green `build`, `typecheck` and `lint` are not validation. When you add a
conditional, fallback, retry or anything that depends on external state:

1. Find every consumer with `grep`, not memory.
2. Exercise every branch at runtime (a `curl` sequence against `npm run dev`, or
   a script against a real database).
3. Check the blast radius: which other surfaces could this break?
4. Say what you couldn't exercise.

## Commands

```bash
npm run dev         # dev server
npm run build       # prisma generate + drift check + next build
npm run typecheck   # next typegen + tsc
npm run lint
npm test            # vitest
npx prisma studio
```

## This tool

**Pawperwork** (pawperwork.pet): the paperwork layer for pet care businesses
(groomers, boarders, daycares, walkers). Each business gets one public intake
link where pet owners fill in pet profiles, upload vaccination records and
e-sign waivers on their phone. The business gets a dashboard that tracks
vaccination expiries and sends reminders. No booking, no payments.

Unlike TabMath and TagYourTurn it has accounts on one side only: the business
signs in (Clerk, email OTP), pet owners never do.

### Routes

| Route | Who | Notes |
| --- | --- | --- |
| `/` | public | landing page, indexable |
| `/intake/[slug]`, `/intake/[slug]/success` | public | the intake form; slug is public by design, `noindex` |
| `/sign-in`, `/sign-up` | public | custom email OTP forms (`src/components/auth/`) |
| `/onboarding` | signed in, no business yet | creates the `Business` row (Server Action) |
| `/dashboard`, `/dashboard/clients`, `/dashboard/clients/[id]`, `/dashboard/settings` | business | `requireBusiness()` |
| `/api/intake/[slug]/submit` | public | rate limited by IP and by slug |
| `/api/uploadthing` | public | must name a real business slug; rate limited by IP |
| `/api/cron/vax-reminders` | Vercel Cron | `Authorization: Bearer $CRON_SECRET` |
| other `/api/*` | business | `requireBusinessApi()` |

### Optional modules in use

- **Accounts with Clerk** ([docs/modules/auth-clerk.md](./docs/modules/auth-clerk.md)),
  business side only. CSP through Clerk (`src/lib/clerk-csp.ts`, report-only).
- **Photo uploads with Uploadthing** ([docs/modules/uploads-uploadthing.md](./docs/modules/uploads-uploadthing.md))
  for vaccination record photos and PDFs. Stored links must pass
  `isUploadthingFileUrl` (`src/lib/upload-url.ts`).
- **PostHog** is wired in and off until its env vars are set.

Not from the template: **Resend** for email (`src/lib/server/email.ts`),
**@react-pdf/renderer** for the PDF intake packet, **react-markdown** for waiver
text, **Vercel Cron** for reminders (`vercel.json`), and **lucide-react** icons
(as in TabMath).

### Authorization

- Per resource, never path based. Dashboard pages call `requireBusiness()`;
  API routes call `requireBusinessApi()` (`src/lib/server/auth.ts`). Both resolve
  the signed-in business, and every query is scoped by its `businessId`: that
  scoping is what keeps businesses apart. One login per business for now.
- Mutating business routes: `rejectCrossSite(req)` → `requireBusinessApi()` →
  rate limit (email-sending routes) → `parseJsonBody`. Bodyless POST/DELETE pass
  `{ hasBody: false }`.
- Return 404 for a bad id or another business's record (`parseId` → `notFound()`).

### Clerk is optional at runtime

Missing Clerk keys must not take down the public intake form, the landing page
or the cron. So:

- `src/proxy.ts` uses `clerkMiddleware` only when `isClerkConfigured()`;
  otherwise it applies the template's own nonce CSP and passes through.
- The root layout renders `ClerkProvider` only when configured. Every Clerk
  component (`UserButton`, `Show`, the OTP forms) sits behind the same check;
  `AuthControls` gets it as a prop.
- `currentUserId()` treats "no Clerk" as signed out in development and throws in
  production, so protected data is never reachable without auth.

Clerk specifics for this SDK version:

- `ClerkProvider` goes inside `<body>`, with `dynamic` so Clerk can nonce its scripts.
- Sign-in is **email OTP only** (password auth disabled on the instance).
  `useSignIn()` / `useSignUp()` return the Future surface
  `{ signIn, errors, fetchStatus }`: `emailCode.sendCode` → `emailCode.verifyCode`
  → `finalize({ navigate })`. The sign-up form must render `<div id="clerk-captcha" />`.
- `SignedIn` / `SignedOut` are gone; use `<Show when="signed-in|signed-out">`.
- No OAuth, so `Referrer-Policy: no-referrer` and COOP `same-origin` stay. Adding
  Google sign-in means switching to TabMath's values (see the module doc).

### Closed sign-ups

`site.signupsOpen: false` hides every Sign up button behind a "Coming soon"
tooltip and hides the Sign in links (`/sign-in` still works by URL), but Clerk can still create users through its own pages. So creating a
business is gated too: `/onboarding` and the `createBusiness` action both call
`onboardingAllowed()` (`src/lib/server/onboarding.ts`, logic in
`src/lib/onboarding-gate.ts`), which only lets through Clerk-verified emails in
`ONBOARDING_ALLOWLIST` (comma-separated, server-only) while sign-ups are closed.
Pair it with Clerk's Restricted sign-up mode. Flip `signupsOpen` to open both.

### Domain rules

- Vaccination status is **derived, never stored** (`src/lib/vax.ts`): VALID,
  EXPIRING (≤ 30 days), EXPIRED, MISSING (no record, or no expiry date). A pet's
  status is the worst across the business's *required* types; MISSING outranks
  EXPIRED.
- Reminders (cron, daily at 13:00 UTC): T-30, T-14, T-7 and 7 days after expiry,
  deduped against `ReminderLog` for 7 days. An unsent email is not logged, so it
  stays due. Manual reminders are not written to `ReminderLog`.
- Waivers are versioned. Editing one bumps `version`; each `WaiverSignature`
  keeps the version it signed, a SHA-256 of that exact text, IP and user agent.
  A waiver with signatures can't be deleted.
- Sensitive business actions call `recordAudit()` (`src/lib/server/audit.ts`),
  best effort. New action strings go in `AuditAction` and `describeAuditEntry`
  (`src/lib/audit-labels.ts`) together.
- Rate limits: intake submit 5/10 min per IP and 30/10 min per slug; uploads
  20/10 min per IP; remind and invite 20/hour per business.

### Documented exceptions

- **`src/lib/server/intake-packet.tsx` uses `StyleSheet.create` and `style={}`.**
  `@react-pdf/renderer` renders a PDF, not the DOM, so Tailwind and the CSP
  don't apply.
- **`<a>` instead of `next/link`** for the PDF download (it must download, not
  client-navigate), uploaded record links on Uploadthing, and `tel:` / `mailto:`.
- **Business logo is a plain `<img>`**, and `img-src` allows any `https:` source
  (`src/config/csp.ts`): the logo is an arbitrary URL the business pastes in.
  `next/image` can't optimize it, and its unoptimized mode adds an inline style
  the nonce CSP blocks.
- **Wider dashboard column** (`max-w-5xl` on `Shell`) for the client table.
- **Monochrome for now.** This repo uses the template's design system as is;
  Pawperwork's own branding is a follow-up (token values in `globals.css`).
- `prisma/seed.mts` runs with `tsx --conditions=react-server` because it imports
  a `server-only` module.

### Local development

- `npm run db:seed` loads a demo business (`demo-grooming-co`) with mixed
  vaccination states. Attach it to your Clerk user with
  `SEED_CLERK_USER_ID=user_xxx npm run db:seed`.
- `EMAIL_TRANSPORT=console` prints emails instead of sending them.
- Trigger the cron locally:
  `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/vax-reminders`.
