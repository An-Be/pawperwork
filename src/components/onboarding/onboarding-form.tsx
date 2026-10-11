"use client";

import { useActionState } from "react";
import { createBusiness, type OnboardingState } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createBusiness, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field htmlFor="name" label="Business name" hint="Your intake link is built from this name.">
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="Demo Grooming Co."
          autoComplete="organization"
          aria-describedby="name-desc"
        />
      </Field>
      <Field htmlFor="email" label="Contact email">
        <Input id="email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" />
      </Field>
      <Field htmlFor="phone" label="Phone (optional)">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </Field>
      <Field htmlFor="address" label="Address (optional)">
        <Input id="address" name="address" autoComplete="street-address" />
      </Field>

      {state?.error ? (
        <p role="alert" className="border-2 border-ink px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg" block>
        {pending ? "Setting up…" : "Create my intake link"}
      </Button>
    </form>
  );
}
