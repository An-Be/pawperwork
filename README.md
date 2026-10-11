# Pet Intake & Vax Tracker

The paperwork layer for pet care businesses — groomers, boarders, daycares and
walkers. A business gets one branded intake link; pet owners open it on their
phone, submit pet profiles, upload vaccination records and e-sign waivers. The
business gets a dashboard of who is missing what, plus automated reminders that
chase expiring records.

No booking, no payments, no POS.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| UI | Tailwind v4 + shadcn/ui (`base-nova`, built on Base UI) |
| Database | Postgres + Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Auth | Clerk — business login only; the intake form is public |
| Uploads | Uploadthing |
| Email | Resend |
| PDF | `@react-pdf/renderer` |
| Cron | Vercel Cron → `/api/cron/vax-reminders` (see `vercel.json`) |

Notes on this version of the stack, which differs from older tutorials:

- **Next 16** renamed `middleware.ts` to **`proxy.ts`** (Node-only runtime).
  `params`, `searchParams`, `cookies()` and `headers()` are all async.
- **Prisma 7** generates a TypeScript client into `src/generated/prisma`
  (gitignored), requires a **driver adapter**, and reads its datasource URL
  from **`prisma7.config.ts`**, not from `schema.prisma`.
- The proxy does **not** do path-based route protection. Clerk deprecates
  `createRouteMatcher` because matcher patterns can drift from real routing.
  Each protected resource authorises itself instead — `requireBusiness()` in
  dashboard pages, `requireBusinessApi()` in authenticated route handlers —
  and both scope their queries to the signed-in business.

## Getting started

```bash
npm install
cp .env.example .env     # then fill it in — see below
npx prisma dev --detach --name pet-intake   # local Postgres, prints a URL
# put that URL (with a database name) in DATABASE_URL
npm run db:migrate
npm run db:seed
npm run dev
```

The seed creates **Demo Grooming Co.** with 2 clients, 3 pets and deliberately
mixed vaccination states, reachable at `/intake/demo-grooming-co`.

To attach the demo business to your own Clerk login:

```bash
SEED_CLERK_USER_ID=user_xxx npm run db:seed
```

### Environment

See `.env.example` for the full list. `DATABASE_URL` is all you need for the
public intake flow; the dashboard additionally needs the two Clerk keys.

Without a `RESEND_API_KEY`, email sends report `skipped` and the cron
deliberately does not log them, so they stay due. For local development set
`EMAIL_TRANSPORT=console` to print emails and treat them as delivered — that is
what makes the reminder cron exercisable offline. It is ignored in production.

Without Clerk keys the app degrades in development only: public routes work,
`/dashboard` redirects to sign-in and authenticated APIs return 401. In
production a missing Clerk key is a hard startup error — auth never silently
switches itself off.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` then `next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Prisma Studio |

Because the generated Prisma client is gitignored, **any build must run
`prisma generate` first**. `build` and `postinstall` both do.

## How vaccination status works

Status is **derived, never stored** — computed from `expiresAt` against today
on every read (`src/lib/vax.ts`), so it can never go stale in the database.

| Status | Meaning |
| --- | --- |
| `VALID` | expires more than 30 days out |
| `EXPIRING` | expires within 30 days, including today |
| `EXPIRED` | expiry date has passed |
| `MISSING` | no record on file, **or** a record with no expiry date |

A pet's status is the **worst** status across its business's *required* types;
optional types are collected and displayed but never drive status or reminders.
Where a type has several records, the one expiring furthest out governs — a
renewal supersedes the lapsed record it replaces.

The dashboard's count buckets **overlap**: a pet appears under every bucket it
has a problem in. Counting each pet only under its worst status would hide a
genuinely expired rabies record behind a separate missing one, which is the
exact thing the dashboard exists to surface.

## Reminders

`GET /api/cron/vax-reminders` runs daily (13:00 UTC, `vercel.json`) and is
protected by `CRON_SECRET`, accepted as `Authorization: Bearer <secret>` (how
Vercel Cron sends it) or `?secret=`.

Windows are disjoint, so one run fires at most one reminder per record:

| Days until expiry | Reminder |
| --- | --- |
| 15 – 30 | `EXPIRING_30` |
| 8 – 14 | `EXPIRING_14` |
| 0 – 7 | `EXPIRING_7` |
| −7 or beyond | `EXPIRED` |

Days −1 to −6 are a deliberate grace gap, so an owner is not emailed the day
after lapsing and again a week later.

Every send is written to `ReminderLog`, and a reminder is suppressed if the same
type was already sent for the same record within 7 days — so a rerun on the same
day sends nothing. A **failed** send is deliberately not logged, so it stays due
for the next run.

Records with no expiry date have nothing to count down from and are never
chased automatically; those are what the manual "Send reminder" button on the
client detail page is for. That button is also deliberately not written to
`ReminderLog`, so it cannot suppress a scheduled reminder that was never sent.

## Waivers and e-signatures

Waivers are markdown and versioned. Editing one bumps `version`; existing
signatures keep their own `waiverVersion` and `documentHash`, so what a client
actually signed is never rewritten underneath them. The client detail page shows
the signed version alongside the current one.

Each signature stores the typed name, timestamp, IP address, user agent, and a
SHA-256 of the exact body **and** version signed (`src/lib/hash.ts`). Because the
version is inside the hashed payload, a signature on an edited waiver can never
collide with the old one.

A waiver with signatures on file cannot be deleted — deleting would cascade the
signatures away. Edit it instead.

## Security notes

- IDs are cuids, so nothing on a public route is enumerable. The business
  `slug` is guessable by design, since the business hands that link out.
- Every authenticated query is scoped by `businessId`; cross-tenant reads
  return 404 rather than leaking existence.
- Vaccination uploads happen on the public intake form, so there is no session
  to authenticate. Uploads must instead name a real business slug, which keeps
  the endpoint from becoming open file hosting.
- `Business.vaxRequirements` is a JSON column and is therefore treated as
  untrusted: it is coerced through `parseVaxRequirements` on read and
  normalised on write.

## Project layout

```
prisma/
  schema.prisma          data model
  seed.mts               demo data
src/
  proxy.ts               Clerk (Next 16 proxy convention)
  lib/
    vax.ts               status engine + reminder windows (pure functions)
    queries.ts           business-scoped dashboard reads
    intake-packet.tsx    PDF document (separate from the route, so testable)
    email.ts             Resend wrapper + plain-text templates
    hash.ts  auth.ts  validation.ts  db.ts  env.ts  slug.ts  defaults.ts
  app/
    page.tsx                       landing (SEO)
    intake/[slug]/                 public 6-step form + success
    onboarding/                    first-run business setup
    dashboard/                     overview, clients, client detail, settings
    api/                           see spec §8
```

## Out of scope

Booking/scheduling, payments, report cards, mobile apps, AI extraction of
expiry dates from record photos, multi-staff roles, client accounts.
