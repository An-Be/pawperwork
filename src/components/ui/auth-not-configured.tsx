import Link from "next/link";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Stand-in for Clerk's <SignIn />/<SignUp /> while Clerk is unconfigured.
 *
 * `ClerkProvider` throws without a publishable key, so the root layout omits
 * it (see src/lib/env.ts). Rendering a Clerk component underneath that would
 * fail with "useSession can only be used within <ClerkProvider />" — an
 * unexplained runtime error on the landing page's primary call to action.
 * This explains the actual state instead, and points at the part that works.
 */
export function AuthNotConfigured({ action }: { action: "sign-in" | "sign-up" }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <PawPrint className="size-5" aria-hidden />
        </span>
        <CardTitle className="font-heading text-lg font-bold">
          Accounts aren&apos;t switched on yet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          {action === "sign-up" ? "Signing up" : "Signing in"} needs
          authentication credentials, which this deployment does not have yet.
          The public intake form works without them.
        </p>
        <p>
          To enable it, set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            CLERK_SECRET_KEY
          </code>{" "}
          in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>,
          then restart the server. See{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            .env.example
          </code>
          .
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Back to home
        </Button>
      </CardContent>
    </Card>
  );
}
