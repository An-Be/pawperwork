import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Shell } from "@/components/ui/shell";
import { currentUserId } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { onboardingAllowed } from "@/lib/server/onboarding";
import { currentUserEmail } from "./actions";

export const metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  // Guarded helper: never calls Clerk's auth() when Clerk is unconfigured,
  // which would throw instead of redirecting.
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  // Already set up: nothing to do here.
  const existing = await db.business.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (existing) redirect("/dashboard");

  const email = await currentUserEmail();
  if (!onboardingAllowed(email)) {
    return (
      <>
        <SiteHeader />
        <Shell>
          <main className="flex flex-1 flex-col justify-center gap-3 py-10">
            <p className="label text-mute">Coming soon</p>
            <h1 className="display text-5xl">New accounts open soon.</h1>
            <p className="text-sm text-mute">
              Your sign-in worked, but Pawperwork isn&apos;t taking new businesses yet. We&apos;ll be ready shortly.
            </p>
          </main>
          <SiteFooter />
        </Shell>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <Shell>
        <main className="flex flex-1 flex-col gap-8 py-10">
          <div className="flex flex-col gap-3">
            <span className="label text-mute">Welcome</span>
            <h1 className="display text-5xl">Set up your business.</h1>
            <p className="text-sm text-mute">
              This is what your clients see at the top of your intake form. You can change any of it later in settings.
            </p>
          </div>
          <OnboardingForm defaultEmail={email} />
        </main>
        <SiteFooter />
      </Shell>
    </>
  );
}
