import Link from "next/link";
import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { SignUpOtpForm } from "@/components/auth/sign-up-otp-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Shell } from "@/components/ui/shell";
import { site } from "@/config/site";
import { isClerkConfigured } from "@/lib/server/env";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <Shell>
        <main className="flex flex-1 flex-col justify-center gap-8 py-10">
          {!site.signupsOpen ? (
            <div className="flex flex-col gap-3">
              <p className="label text-mute">Coming soon</p>
              <h1 className="display text-5xl">New accounts open soon.</h1>
            </div>
          ) : isClerkConfigured() ? (
            <>
              <div className="flex flex-col gap-3">
                <h1 className="display text-5xl">Set up your intake link.</h1>
                <p className="text-sm text-mute">Free, and ready in about a minute.</p>
              </div>
              <SignUpOtpForm />
              <p className="text-sm text-mute">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-ink underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <AuthNotConfigured action="sign-up" />
          )}
        </main>
        <SiteFooter />
      </Shell>
    </>
  );
}
