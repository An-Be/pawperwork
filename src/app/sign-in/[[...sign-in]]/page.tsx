import Link from "next/link";
import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { SignInOtpForm } from "@/components/auth/sign-in-otp-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Shell } from "@/components/ui/shell";
import { isClerkConfigured } from "@/lib/server/env";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <Shell>
        <main className="flex flex-1 flex-col justify-center gap-8 py-10">
          {isClerkConfigured() ? (
            <>
              <div className="flex flex-col gap-3">
                <h1 className="display text-5xl">Welcome back.</h1>
                <p className="text-sm text-mute">Sign in to your dashboard.</p>
              </div>
              <SignInOtpForm />
              <p className="text-sm text-mute">
                New here?{" "}
                <Link href="/sign-up" className="text-ink underline underline-offset-2">
                  Create an account
                </Link>
              </p>
            </>
          ) : (
            <AuthNotConfigured action="sign-in" />
          )}
        </main>
        <SiteFooter />
      </Shell>
    </>
  );
}
