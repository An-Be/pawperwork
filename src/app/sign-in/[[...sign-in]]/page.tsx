import Link from "next/link";
import { PawPrint } from "lucide-react";
import { AuthNotConfigured } from "@/components/ui/auth-not-configured";
import { SignInOtpForm } from "@/components/ui/sign-in-otp-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <AuthNotConfigured action="sign-in" />
      </main>
    );
  }

  return (
    <main className="bg-warm-glow flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <PawPrint className="size-5" aria-hidden />
          </span>
          <CardTitle className="font-heading text-lg font-bold">
            Welcome back
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to your dashboard
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignInOtpForm />
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-primary underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
