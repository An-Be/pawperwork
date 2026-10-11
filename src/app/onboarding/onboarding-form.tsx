"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusiness, type OnboardingState } from "./actions";

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createBusiness,
    undefined,
  );

  return (
    // The page wrapper is text-center for the heading/icon above; reset to
    // left-aligned here so labels and inputs read normally.
    <form action={action} className="mt-8 space-y-5 text-left">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="Demo Grooming Co."
          autoComplete="organization"
        />
        <p className="text-xs text-muted-foreground">
          Your intake link is built from this name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Contact email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" autoComplete="street-address" />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting up…" : "Create my intake link"}
      </Button>
    </form>
  );
}
