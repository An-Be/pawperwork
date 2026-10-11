# Pawperwork

The paperwork layer for pet care businesses: groomers, boarders, daycares and
walkers. A business gets one intake link; pet owners open it on their phone,
fill in pet profiles, upload vaccination records and e-sign waivers. The
business gets a dashboard of who is missing what, plus reminders that chase
expiring records. No booking, no payments.

Built on [tool-template](https://github.com/An-Be/tool-template). Project rules
and the domain notes live in [`AGENTS.md`](./AGENTS.md).

## Stack

Next.js 16, React 19, TypeScript, Tailwind 4 with the template's hand-rolled
primitives, Postgres on Neon with Prisma 7, Vitest. Plus Clerk (business login,
email OTP), Uploadthing (record photos), Resend (email), `@react-pdf/renderer`
(intake packets) and Vercel Cron (reminders).

## Run it

```bash
npm install
cp .env.example .env      # app-role pooled + direct Neon URLs, plus the service keys you have
npx prisma migrate deploy # with the owner role, first time only
npm run db:seed           # optional demo business at /intake/demo-grooming-co
npm run dev
```

Only the database is required to start. Without Clerk keys the public pages
and the intake form still work and the dashboard stays locked; without Resend,
emails are skipped (or printed with `EMAIL_TRANSPORT=console`); without
Uploadthing, record photos can't be attached.

## Commands

```bash
npm run dev         # dev server
npm run build       # prisma generate + drift check + next build
npm run typecheck   # next typegen + tsc
npm run lint
npm test            # vitest
npm run db:seed     # demo data (local only)
```

## Deploying

Follow the template's checklist (Neon in `aws-us-east-2`, `prisma/sql/app-role.sql`,
Vercel in `cle1`). Production also needs `CLERK_*`, `UPLOADTHING_TOKEN`,
`RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` and `NEXT_PUBLIC_APP_URL`; see
`.env.example`.
