import Link from "next/link";
import { PawPrint } from "lucide-react";
import { AuthNotConfigured } from "@/components/ui/auth-not-configured";
import { SignUpOtpForm } from "@/components/ui/sign-up-otp-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/env";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <AuthNotConfigured action="sign-up" />
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
            Set up your intake link
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Free, and ready in about a minute
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignUpOtpForm />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-primary underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
