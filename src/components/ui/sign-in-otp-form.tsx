"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { otpCodeSchema, otpEmailSchema } from "@/lib/validation";

/**
 * Email OTP sign-in (spec §5: business login only).
 *
 * `useSignIn()` in this SDK returns the `SignInFuture` surface built for custom
 * flows — `{ signIn, errors, fetchStatus }` — not the older
 * `{ isLoaded, signIn, setActive }` shape. `finalize()` activates the session,
 * so `setActive` is not called directly.
 *
 *   emailCode.sendCode({ emailAddress })
 *   -> emailCode.verifyCode({ code })
 *   -> finalize({ navigate })
 */
export function SignInOtpForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  /** Clerk's reactive field errors, plus our own pre-flight validation. */
  const message =
    localError ??
    errors?.fields?.identifier?.message ??
    errors?.fields?.code?.message ??
    errors?.global?.[0]?.message ??
    null;

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const parsed = otpEmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);

    const { error } = await signIn.emailCode.sendCode({
      emailAddress: parsed.data,
    });
    if (!error) setStep("code");
  }

  async function finish() {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/dashboard");
        // decorateUrl may return an absolute URL for Safari ITP.
        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }
        router.push(url);
      },
    });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Invalid code.");
      return;
    }
    setLocalError(null);

    const { error } = await signIn.emailCode.verifyCode({ code: parsed.data });
    if (error) return;
    if (signIn.status === "complete") await finish();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Enter the code we emailed you</Label>
          <Input
            id="code"
            name="code"
            // `one-time-code` lets phones offer the code from the notification,
            // which is most of the point of OTP on mobile.
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="tracking-[0.4em]"
          />
          <p className="text-xs text-muted-foreground">Sent to {email}</p>
        </div>

        {message ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Verifying…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            signIn.reset();
            setStep("email");
            setCode("");
            setLocalError(null);
          }}
        >
          Use a different email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@yourbusiness.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll email you a 6-digit code. No password needed.
        </p>
      </div>

      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending code…" : "Email me a code"}
      </Button>
    </form>
  );
}
