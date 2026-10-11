"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Visible auth controls for the public header: sign-in and sign-up when signed
 * out, the user menu when signed in.
 *
 * Client component on purpose — the server `<Show />` reads auth state, which
 * would opt the SEO landing page out of static rendering. Hydrating these
 * controls keeps the static shell intact.
 *
 * `clerkConfigured` is resolved on the server and passed in: every Clerk
 * component needs `ClerkProvider`, which the root layout omits when there are
 * no credentials. Without this guard these would throw "useSession can only be
 * used within <ClerkProvider />".
 */
export function AuthControls({ clerkConfigured }: { clerkConfigured: boolean }) {
  if (!clerkConfigured) {
    // Plain links; the auth pages explain that accounts are not enabled yet.
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/sign-in" />}
        >
          Sign in
        </Button>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/sign-up" />}
        >
          Sign up
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Dashboard
        </Button>
        <UserButton />
      </Show>
    </div>
  );
}
