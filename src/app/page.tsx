import Link from "next/link";
import type { Metadata } from "next";
import {
  BellRing,
  Camera,
  FileSignature,
  FileText,
  Heart,
  PawPrint,
  Share2,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthControls } from "@/components/ui/auth-controls";
import { isClerkConfigured } from "@/lib/env";

export const metadata: Metadata = {
  // absolute: skip the layout's "%s · Pet Intake" template; the brand leads here.
  title: { absolute: "Pawperwork: Intake and Vax Tracking for Pet Care" },
  description:
    "One intake link for your grooming, boarding, or daycare business. Owners " +
    "submit profiles, upload vax records, and e-sign waivers from their phone.",
};

const STEPS = [
  {
    icon: Share2,
    title: "Share one link",
    body: "Every client gets the same branded intake link. No app to install, no account to create — it opens straight on their phone.",
  },
  {
    icon: FileSignature,
    title: "They fill it in once",
    body: "Owner details, every pet, vet and emergency contacts, a photo of each vaccination record, and your waivers signed. About five minutes.",
  },
  {
    icon: BellRing,
    title: "You stop chasing paperwork",
    body: "Your dashboard shows exactly who is missing what. Reminders go out at 30, 14 and 7 days before a vaccination expires, and again once it lapses.",
  },
];

const FEATURES = [
  {
    icon: Syringe,
    title: "Vaccination expiry tracking",
    body: "Rabies, distemper, bordetella or anything you add. Each record is valid, expiring, expired or missing — computed from the dates, never stale.",
  },
  {
    icon: BellRing,
    title: "Automated email reminders",
    body: "T-30, T-14, T-7 and after expiry. Deduplicated, so nobody gets the same reminder twice.",
  },
  {
    icon: FileSignature,
    title: "E-signed waivers",
    body: "Typed-signature waivers with timestamp, IP and a SHA-256 hash of the exact text signed. Edit a waiver and old signatures stay pinned to the version they signed.",
  },
  {
    icon: Camera,
    title: "Photo uploads from the camera",
    body: "Owners photograph the certificate from the vet. You verify it with one click.",
  },
  {
    icon: FileText,
    title: "PDF intake packets",
    body: "Export a client's full profile, records and signed waiver text as a single PDF.",
  },
  {
    icon: Heart,
    title: "Built for one person to run",
    body: "No booking, no payments, no POS. Just the paperwork layer, which is the part that actually costs you time.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PawPrint className="size-4" aria-hidden />
          </span>
          <span className="font-heading text-lg font-bold">Pet Intake</span>
        </Link>
        <AuthControls clerkConfigured={isClerkConfigured()} />
      </header>

      <section className="bg-warm-glow">
        <div className="mx-auto max-w-3xl px-4 pt-14 pb-16 text-center sm:pt-20">
          <span className="inline-flex items-center rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
            🐾 For groomers, boarders, daycares and walkers
          </span>
          <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Paperwork that keeps up with the pets.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
            Send one link. Get pet profiles, vaccination records and signed
            waivers back — and an automatic nudge to every owner whose
            paperwork is about to lapse.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Renders an <a>, so Base UI needs nativeButton={false}. */}
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Set up your intake link
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No booking. No payments. No point of sale.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <CardTitle className="text-base">
                    <span className="mr-1.5 text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>
                    {step.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {step.body}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-accent/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight">
            Everything in the paperwork layer, nothing else
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <feature.icon className="size-4.5" aria-hidden />
                </span>
                <p className="mt-3 font-heading font-bold">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <PawPrint className="size-3.5" aria-hidden />
          Pet Intake · the paperwork layer for pet care businesses ·{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline underline-offset-4"
          >
            get your intake link
          </Link>
        </p>
      </footer>
    </main>
  );
}
