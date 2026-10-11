"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { otpCodeSchema, otpEmailSchema } from "@/lib/validation";

/**
 * Email OTP sign-up.
 *
 *   create({ emailAddress })
 *   -> verifications.sendEmailCode()
 *   -> verifications.verifyEmailCode({ code })
 *   -> finalize({ navigate })
 *
 * The Clerk instance has password auth disabled and email verification
 * required, so the code is the only step between an address and an account.
 */
export function SignUpOtpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  const message =
    localError ??
    errors?.fields?.emailAddress?.message ??
    errors?.fields?.code?.message ??
    errors?.global?.[0]?.message ??
    null;

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const parsed = otpEmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);

    const { error } = await signUp.create({ emailAddress: parsed.data });
    if (error) return;

    const sent = await signUp.verifications.sendEmailCode();
    if (!sent.error) setStep("code");
  }

  async function finish() {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        // A new account has no Business row yet, so /dashboard forwards to
        // /onboarding to create one.
        const url = decorateUrl("/dashboard");
        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }
        router.push(url);
      },
    });
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Invalid code.");
      return;
    }
    setLocalError(null);

    const { error } = await signUp.verifications.verifyEmailCode({
      code: parsed.data,
    });
    if (error) return;
    if (signUp.status === "complete") await finish();
  }

  async function resend() {
    if (busy) return;
    setLocalError(null);
    await signUp.verifications.sendEmailCode();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-4">
        <Field htmlFor="signup-code" label="Enter the code we emailed you" hint={<>Sent to {email}</>}>
          <Input
            aria-describedby="signup-code-desc"
            id="signup-code"
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="tracking-[0.4em]"
          />
        </Field>

        {message ? (
          <p role="alert" className="border-2 border-ink px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} block>
          {busy ? "Verifying…" : "Create account"}
        </Button>
        <Button type="button" variant="ghost" block disabled={busy} onClick={resend}>
          I need a new code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      <Field
        htmlFor="signup-email"
        label="Email address"
        hint={<>We&apos;ll email you a 6-digit code. No password to choose or forget.</>}
      >
        <Input
          aria-describedby="signup-email-desc"
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@yourbusiness.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      {message ? (
        <p role="alert" className="border-2 border-ink px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} block>
        {busy ? "Sending code…" : "Email me a code"}
      </Button>

      {/*
        Required: Clerk's bot sign-up protection renders its CAPTCHA widget
        into this node. Without it, sign-up fails with a captcha error.
      */}
      <div id="clerk-captcha" />
    </form>
  );
}
