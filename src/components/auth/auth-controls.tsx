"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Type and color come from the header's nav slot. Buttons reset text-transform, so restate uppercase.
const navLink = "uppercase hover:text-ink";
const navStrong = "uppercase text-ink hover:text-mute";

/**
 * Header controls for public pages: sign in / sign up when signed out, the
 * dashboard link and user menu when signed in.
 *
 * `clerkConfigured` is resolved on the server and passed in: every Clerk
 * component needs ClerkProvider, which the root layout omits when there are
 * no credentials. Without this guard these would throw "useSession can only
 * be used within <ClerkProvider />".
 */
export function AuthControls({ clerkConfigured }: { clerkConfigured: boolean }) {
  if (!clerkConfigured) {
    // Plain links; the auth pages explain that accounts aren't switched on yet.
    return (
      <>
        <Link href="/sign-in" className={navLink}>
          Sign in
        </Link>
        <Link href="/sign-up" className={navStrong}>
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className={navLink}>
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className={navStrong}>
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={navLink}>
          Dashboard
        </Link>
        <UserButton />
      </Show>
    </>
  );
}
