<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> **Everything below is project-owned and must stay OUTSIDE the markers above.**
> `next dev` replaces the entire contents between `BEGIN:nextjs-agent-rules` and
> `END:nextjs-agent-rules` with its own text whenever they do not match
> (`upsertAgentRulesBlock` in the file named above). Rules written inside that
> block are destroyed on the next `next dev`. Text before and after it is kept.

# Project Context & Code Quality Rules

## Tech Stack

Pet Intake & Vax Tracker — intake forms, vaccination expiry tracking and
e-signed waivers for pet care businesses.

### Core

- **Next.js 16.3.8** — App Router, React Server Components by default, Turbopack
- **React 19.2.8**
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** — CSS-first config; **there is no `tailwind.config.ts`**,
  theme tokens live in `src/app/globals.css` under `@theme inline`
- **shadcn/ui** — `base-nova` style, built on **Base UI** (`@base-ui/react` 1.8).
  Config in `components.json`. Primitives are generated into
  `src/components/ui/` and may be overwritten by `npx shadcn add`.
- `cn` (the `cn` package, re-exported from `src/lib/utils.ts`) for class merging
- `lucide-react` icons, `sonner` toasts

### Data

- **Postgres** + **Prisma 7.10** with `@prisma/adapter-pg` + `pg`
- Generator is **`prisma-client`** (not `prisma-client-js`): it emits
  **TypeScript** into `src/generated/prisma`, which is **gitignored** — every
  build must run `prisma generate` first (`build` and `postinstall` both do)
- Datasource URL comes from **`prisma7.config.ts`**, not `schema.prisma`
- A **driver adapter is mandatory** in Prisma 7 — see `src/lib/db.ts`
- `importFileExtension = "ts"` in the generator, paired with
  `allowImportingTsExtensions` in `tsconfig.json`, so `prisma/seed.mts` can run
  the generated client under Node's native TypeScript stripping
- **`npx prisma migrate dev` (with or without `--create-only`) does not work
  against the local `npx prisma dev` server, full stop** — not a flag or
  shadow-database-URL problem. That server auto-syncs *every* database it
  manages to the project's current migration history the instant the database
  is created, including a shadow database `migrate dev` creates for itself to
  diff against. `migrate dev` needs an empty database to replay history into
  and never gets one here, so it always fails with something like `type
  "X" already exists` on the *first* historical migration — confusing,
  because the error names an old migration, not the new one you're adding.
  To add a migration against this local server:
  ```bash
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
    > prisma/migrations/$(date -u +%Y%m%d%H%M%S)_<name>/migration.sql
  npx prisma migrate deploy   # applies it directly — no shadow DB involved
  ```
  `migrate deploy` never uses a shadow database (that's what makes it
  production-safe), so this sidesteps the problem entirely. Only matters
  locally — a real standalone Postgres (production, or another developer's
  own install) doesn't have this behavior, and `shadowDatabaseUrl` in
  `prisma7.config.ts`'s `datasource` block is there for that case.

### Services

- **Clerk 7.9** (`@clerk/nextjs`) — business login only; the intake form is public
- **Uploadthing 7.7** — vaccination record photos
- **Resend 6.32** — transactional email
- **`@react-pdf/renderer` 4.9** — PDF intake packets
- **Zod 4** — all external input validation
- **Vercel Cron** → `/api/cron/vax-reminders` (`vercel.json`)
- `react-markdown` — renders waiver bodies
- `tsx` (dev) — runs standalone TypeScript scripts

### Version-specific rules that override older training data

- `middleware.ts` is **`proxy.ts`** in Next 16. Node-only runtime, not
  configurable. Export a function **named `proxy`** (a default export also
  works, but named satisfies the no-default-exports rule below).
- `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are all
  **async** — `await` them. Synchronous access was removed in 16.
- Use the generated route types: `PageProps<'/route'>`, `LayoutProps<'/route'>`,
  `RouteContext<'/api/route'>`. They are global after `next typegen`, which
  `next dev`/`next build` run automatically. Run `npx next typegen` if a new
  route's types are missing.
- Clerk **deprecates `createRouteMatcher`**. Do not add path-based protection to
  the proxy; authorise inside each protected resource instead (see below).
- Import Prisma types/client from `@/generated/prisma/client`, **never** from
  `@prisma/client`.
- **shadcn `base-nova` has no `asChild`.** Base UI uses a `render` prop instead:
  `<Button render={<Link href="/x" />}>Label</Button>`, with the label as
  children rather than inside the rendered element.
- When a `render` prop supplies a **non-`<button>`** element (a `next/link`
  anchor, a download `<a>`, a `<div>`), you must also pass
  **`nativeButton={false}`**. Base UI defaults it to `true` and otherwise logs
  "A component that acts as a button expected a native `<button>`" and drops
  the `role="button"` / `tabindex` it would add — a real accessibility
  regression, not just console noise.

### Clerk conventions (per the `clerk-quickstart` skill)

- **`ClerkProvider` goes inside `<body>`**, never wrapping `<html>`.
- `auth()` is async on Next 15+ — always `await auth()`.
- Use `@clerk/nextjs`; never legacy Core 2 names (`@clerk/clerk-react`).
- Never expose `CLERK_SECRET_KEY` to client code.
- `proxy.ts` `config.matcher` must include `"/__clerk/:path*"` once, **after**
  the `"/(api|trpc)(.*)"` matcher — Clerk's auto-proxy path.
- `clerk init` writes Clerk credentials to **both `.env` and `.env.local`**,
  currently identical. Next loads `.env.local` at higher precedence, so that
  copy wins. If you ever rotate keys (`clerk env pull`), update both or delete
  one — two copies that disagree is a silent-misconfiguration trap.
- The Prisma CLI and `prisma/seed.mts` load only `.env` through `dotenv`, so
  `DATABASE_URL` must stay in `.env`.
- Visible auth controls use `<Show when="signed-in|signed-out">` with
  `SignInButton` / `SignUpButton` / `UserButton`. `SignedIn` / `SignedOut` are
  removed in this version — Clerk re-exports them from
  `removedControlComponents`. Prefer the **client** `Show` in the public header
  so the static SEO landing page is not opted into dynamic rendering.
- This project uses shadcn/ui, so Clerk is themed with `@clerk/ui`:
  `appearance={{ theme: shadcn }}` plus
  `@import "@clerk/ui/themes/shadcn.css"` in `globals.css`.
- Every Clerk component sits under a conditional provider, so each one needs an
  `isClerkConfigured()` guard — see **Validating Decisions**.
- Verify setup with `npx -y clerk@latest doctor`.
- **Auth is email OTP only.** The instance has `auth_password` disabled and
  `auth_email.sign_in_strategies = ["email_code"]`. Inspect with
  `clerk config pull --keys auth_email auth_password`; change with
  `clerk config patch --json '{...}' --dry-run` first.
- `useSignIn()` / `useSignUp()` in this SDK return the **Future** surface
  `{ signIn, errors, fetchStatus }` (`SignInFutureResource`), NOT the older
  `{ isLoaded, signIn, setActive }`. Note `@clerk/shared` still ships the
  legacy `UseSignInReturn` type — it is not what the hook returns, so trust
  `tsc` over that type. Use `emailCode.sendCode` / `emailCode.verifyCode` and
  `verifications.sendEmailCode` / `verifications.verifyEmailCode`, then
  `finalize({ navigate })`, which activates the session (no `setActive` call).
- A custom sign-up form must render `<div id="clerk-captcha" />` or bot
  protection fails the attempt.
- Code inputs use `autoComplete="one-time-code"` so phones can autofill.

## Essential Commands

- Dev Server: `npm run dev`
- Build & Verification: `npm run build`
- Code Quality Check: `npm run lint` && `npx tsc --noEmit`
- Database: `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`
- Local Postgres: `npx prisma dev --detach --name pet-intake`

## Architecture & Code Cleanliness

### 1. Component Boundaries

- **Server Components by Default:** Never use "use client" unless a component specifically requires browser APIs, state, or event listeners.
- **Data Fetching:** Fetch data inline directly within async Server Components or dedicated `lib/` modules. Never use `useEffect` or client-side fetchers for initial page loads.
- **Folder Structure:** Page layouts and routes go in `app/`. Reusable UI pieces belong in `components/ui/`. Pure functional logic goes into `lib/`.

### 2. Strict Cleanliness Rules

- **No Default Exports:** Use explicitly named exports for all files (e.g., `export const MyComponent = () => ...`) except for Next.js required entry files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
- **No Inline Styles:** Use Tailwind utility classes exclusively. Raw CSS objects or inline HTML styles are strictly forbidden.
- **Early Returns:** Write functions with clear guard clauses and early returns to avoid deeply nested `if/else` statements.
- **State Location:** Keep state localized. Do not lift state globally unless a shared context or state management solution is explicitly mandated.
- **Code cleanliness:** clear component architecture — do not put multiple components in one file.

### 3. TypeScript & Type Safety

- **No Implicit Any:** Absolutely zero usage of `any`. If a type is unknown or dynamic, explicitly use `unknown` or a strict generic.
- **Zod Schema Validation:** Validate all external inputs, API route responses, and form data fields utilizing Zod schemas before manipulating the data.
- **Next.js Core Optimization:** Always enforce `next/image` for image rendering and `next/link` for internal navigation.

### 4. Authorisation

- Protection is **per-resource, never path-based**. Dashboard pages call
  `requireBusiness()`; authenticated route handlers call
  `requireBusinessApi(request)`. Both resolve the signed-in business and every
  query is scoped by its `businessId` — that scoping is what enforces tenant
  isolation. `requireBusinessApi` takes the request because it also runs the
  CSRF guard (below) — every call site must pass it, GET handlers included
  (the guard is a no-op for safe methods, but the signature stays uniform).
- Public surfaces (`/`, `/intake/[slug]`, `/api/intake/*`, `/api/cron/*`,
  `/api/uploadthing`) must keep working when Clerk is unconfigured. Never move
  an auth failure into `proxy.ts`: it runs on every request and would take the
  public intake form down with it.
- Return 404, not 403, for a resource belonging to another business, so ids do
  not leak existence.

### 5. Hardening (`src/lib/csrf.ts`, `rate-limit.ts`, `audit.ts`)

- **CSRF:** `requireBusinessApi` calls `assertSameOrigin(request)` before
  anything else. State-changing requests (non-GET/HEAD/OPTIONS) need a
  matching `Origin` (or same-origin `Referer` as fallback) or they get a 403
  — Clerk's session is a cookie, so without this a cross-origin page could
  trigger a mutation using a signed-in business owner's session. GET routes
  are unaffected.
- **Rate limiting:** Postgres-backed (`RateLimitHit`; no Redis/KV is
  provisioned). Call `enforceRateLimit(key, limit, windowMs)` — it throws
  `ApiRateLimitError` (→ 429 via `jsonError`) when over budget. Required on
  every **public, unauthenticated** mutating route (currently: intake submit,
  by IP and by slug; the Uploadthing middleware, by IP) — those have no
  session to hold anyone accountable. Authenticated email-sending routes
  (`remind`, `invite`) are rate-limited per business too, as a backstop
  against a stuck double-click or a scripted session, not as the primary
  defense (auth already is).
- **Audit log:** call `recordAudit({ businessId, action, targetType, ... })`
  from `src/lib/audit.ts` after any sensitive business-side mutation succeeds
  (verifying a record, creating/editing/deleting a waiver, changing settings,
  sending a reminder or invite). It's best-effort — a logging failure is
  caught and only logged, never thrown, so it can't break the action it's
  recording. Add new action strings to the `AuditAction` union and to
  `describeAuditEntry`'s switch together; the two must stay in sync or a new
  action falls through to the generic label.

## Validating Decisions

**When you introduce a conditional, a fallback, or a degraded mode, validate
every case. Do not guess, and do not reason that an untested case is probably
acceptable.**

A green `build`, `tsc --noEmit` and `lint` are **not** validation. They do not
catch a missing React context, an optional prop with a wrong default, or a
branch that is never rendered during a build where every route is dynamic.

Required steps for any such change:

1. **Enumerate every consumer** of the thing you made conditional — `grep` for
   it across `src/`, do not work from memory of what you wrote.
2. **Exercise both states at runtime**, not just the happy one: start the
   server, request every affected route, and read the server log.
3. **Check the blast radius.** Ask which unrelated surfaces the branch can take
   down with it, and confirm they still work.
4. **State what you could not exercise.** If a path is unreachable (behind
   auth, needs a credential), say so explicitly rather than implying it passed.

Precedents in this repo, both of which shipped a real defect behind a green
build:

- `ClerkProvider` is rendered conditionally, but only `UserButton` was guarded.
  `<SignIn />` and `<SignUp />` were left to throw "useSession can only be used
  within `<ClerkProvider />`" — reached by the landing page's primary call to
  action. The reasoning at the time was that a broken sign-in page was
  "acceptable"; it was not, and it was never tested.
- Base UI's `Button` defaults `nativeButton` to `true`. Five call sites passed
  `render={<Link />}`, which renders an `<a>`. Types compiled, so it looked
  done, while Base UI silently dropped `role="button"` and `tabindex` — an
  accessibility regression, visible only in the browser console.

## Documented Exceptions

These are deliberate and reviewed. Do not "fix" them without discussion.

- **`src/lib/intake-packet.tsx` uses `StyleSheet.create` and `style={}`.**
  `@react-pdf/renderer` renders to PDF, not the DOM — Tailwind cannot apply.
  This is the only file exempt from the no-inline-styles rule. Its private
  `Field` formatting helper also lives alongside the document it serves.
- **`<a>` instead of `next/link`** is correct for: the PDF download
  (`/api/clients/[id]/packet` — `next/link` would client-navigate instead of
  downloading), uploaded record URLs on an external host, and `tel:`/`mailto:`.
  `next/link` is required for all internal **page** navigation.
- **Business logo uses `unoptimized`** on `next/image`. The URL is
  business-supplied and arbitrary, so it cannot be enumerated in
  `images.remotePatterns`.
- **Default exports** remain in `next.config.ts` and `prisma7.config.ts`, which
  their tooling requires, and in `app/**/page.tsx` / `layout.tsx` per the rule.

## What NOT to Touch

- Do not refactor or modify legacy files located inside `app/api/deprecated/`. *(No such directory exists today.)*
- Never modify or alter the core configuration arrays in `tailwind.config.ts` or `next.config.ts` unless explicitly instructed. *(There is no `tailwind.config.ts` — Tailwind 4 is configured in `src/app/globals.css`. `next.config.ts` currently sets only `turbopack.root`, which pins the workspace root so Turbopack does not resolve a lockfile outside the repo.)*
- `src/generated/**` is generated by `prisma generate`. Never hand-edit it.
- `src/components/ui/` primitives created by `npx shadcn add` may be regenerated.

## Active Focus

- Refactoring older route handlers to match current Zod schema validation rules.
