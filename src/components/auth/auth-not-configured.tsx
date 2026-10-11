import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Stand-in for the sign-in and sign-up forms while Clerk is unconfigured.
 *
 * ClerkProvider throws without a publishable key, so the root layout omits it
 * (see src/lib/server/env.ts). Rendering a Clerk component underneath that
 * would fail with "useSession can only be used within <ClerkProvider />", an
 * unexplained error on the landing page's main call to action. This explains
 * the actual state instead, and points at the part that works.
 */
export function AuthNotConfigured({ action }: { action: "sign-in" | "sign-up" }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="display text-4xl">Accounts aren&apos;t switched on yet.</h1>
      <p className="text-sm text-mute">
        {action === "sign-up" ? "Signing up" : "Signing in"} needs authentication credentials, which this deployment
        doesn&apos;t have yet. The public intake form works without them.
      </p>
      <p className="text-sm text-mute">
        To turn it on, set <code className="bg-wash px-1">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
        <code className="bg-wash px-1">CLERK_SECRET_KEY</code> in <code className="bg-wash px-1">.env</code>, then
        restart the server. See <code className="bg-wash px-1">.env.example</code>.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Back to home
      </Link>
    </div>
  );
}
