import { redirect } from "next/navigation";
import { PawPrint } from "lucide-react";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentUserEmail } from "./actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your business" };

/**
 * Per-user page: must never be prerendered or cached.
 *
 * This is not optional. `currentUserId()` returns early without touching
 * `auth()` when Clerk is unconfigured, so Next sees no request-time API and
 * would otherwise prerender this page at build time — where the production
 * "Clerk is not configured" guard throws and fails the whole build.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // Guarded helper: never calls Clerk's auth() when Clerk is unconfigured,
  // which would throw instead of redirecting.
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  // Already set up — nothing to do here.
  const existing = await prisma.business.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  return (
    <main className="bg-warm-glow flex min-h-full flex-1 items-center justify-center px-4 py-14">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <PawPrint className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
          Welcome! Let&apos;s set up your business
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is what your clients see at the top of your intake form. You
          can change any of it later in settings.
        </p>
        <OnboardingForm defaultEmail={await currentUserEmail()} />
      </div>
    </main>
  );
}
