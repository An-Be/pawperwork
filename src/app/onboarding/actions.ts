"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DEFAULT_WAIVER } from "@/lib/defaults";
import { currentUserId } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isClerkConfigured } from "@/lib/server/env";
import { uniqueSlug } from "@/lib/slug";
import { onboardingSchema } from "@/lib/validation";
import { DEFAULT_VAX_REQUIREMENTS } from "@/lib/vax";

export type OnboardingState = { error?: string } | undefined;

/**
 * Turns a fresh Clerk signup into a Business row, seeded with the default
 * vaccine requirements and a starter waiver so the intake link works
 * immediately: sign up, set required vaccinations, copy the link.
 *
 * A Server Action: Next checks the Origin header on these itself, so there is
 * no rejectCrossSite call here.
 */
export async function createBusiness(_previous: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const existing = await db.business.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please enter a business name and a valid email address." };
  }

  const slug = await uniqueSlug(parsed.data.name, async (candidate) => {
    const hit = await db.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return hit !== null;
  });

  await db.business.create({
    data: {
      clerkUserId: userId,
      slug,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      vaxRequirements: DEFAULT_VAX_REQUIREMENTS,
      waivers: { create: [DEFAULT_WAIVER] },
    },
  });

  redirect("/dashboard");
}

/** Pre-fills the form with the signed-in user's email. */
export async function currentUserEmail(): Promise<string> {
  if (!isClerkConfigured()) return "";
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? "";
}
