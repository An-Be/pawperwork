import Link from "next/link";
import type { Metadata } from "next";
import { AuthControls } from "@/components/auth/auth-controls";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Shell } from "@/components/ui/shell";
import { site } from "@/config/site";
import { isClerkConfigured } from "@/lib/server/env";

export const metadata: Metadata = {
  title: { absolute: site.title },
  description: site.description,
};

const STEPS = [
  {
    title: "Share one link",
    body: "Every client gets the same intake link. No app to install, no account to create. It opens straight on their phone.",
  },
  {
    title: "They fill it in once",
    body: "Owner details, every pet, vet and emergency contacts, a photo of each vaccination record, and your waivers signed. About five minutes.",
  },
  {
    title: "You stop chasing paperwork",
    body: "Your dashboard shows who is missing what. Reminders go out 30, 14 and 7 days before a vaccination expires, and again once it lapses.",
  },
];

const FEATURES = [
  {
    title: "Vaccination expiry tracking",
    body: "Rabies, distemper, bordetella or anything you add. Each record is up to date, expiring, expired or missing, worked out from the dates.",
  },
  {
    title: "Automatic email reminders",
    body: "30, 14 and 7 days out, and after expiry. Nobody gets the same reminder twice.",
  },
  {
    title: "E-signed waivers",
    body: "Typed-signature waivers with a timestamp, IP and a SHA-256 hash of the exact text signed. Edit a waiver and old signatures stay pinned to the version they signed.",
  },
  {
    title: "Photos from the camera",
    body: "Owners photograph the certificate from the vet. You verify it with one click.",
  },
  {
    title: "PDF intake packets",
    body: "Export a client's profile, records and signed waiver text as one PDF.",
  },
  {
    title: "Just the paperwork",
    body: "No booking, no payments, no point of sale. Only the part that actually costs you time.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader right={<AuthControls clerkConfigured={isClerkConfigured()} />} />
      <Shell width="wide">
        <main className="flex flex-1 flex-col gap-14 py-10">
          <section className="flex flex-col gap-5">
            <p className="label text-mute">For groomers, boarders, daycares and walkers</p>
            <h1 className="display text-5xl sm:text-6xl">Paperwork that keeps up with the pets.</h1>
            <p className="text-sm text-mute">
              Send one link. Get pet profiles, vaccination records and signed waivers back, plus an automatic nudge to
              every owner whose paperwork is about to lapse.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                Set up your intake link
              </Link>
              <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in
              </Link>
            </div>
          </section>

          <section>
            <SectionLabel n="01">How it works</SectionLabel>
            <ol className="grid border border-ink sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-2 border-ink p-5 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l"
                >
                  <span className="display text-3xl">{String(index + 1).padStart(2, "0")}</span>
                  <p className="font-display text-lg font-medium tracking-[-0.02em]">{step.title}</p>
                  <p className="text-sm text-mute">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionLabel n="02">What&apos;s included</SectionLabel>
            <ul className="grid gap-px border border-ink bg-ink sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex flex-col gap-1 bg-paper p-5">
                  <p className="font-display text-lg font-medium tracking-[-0.02em]">{feature.title}</p>
                  <p className="text-sm text-mute">{feature.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <SiteFooter />
      </Shell>
    </>
  );
}
