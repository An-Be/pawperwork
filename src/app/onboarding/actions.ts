"use server";

import { currentUser } from "@clerk/nextjs/server";
import { currentUserId } from "@/lib/auth";
import { isClerkConfigured } from "@/lib/env";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { DEFAULT_VAX_REQUIREMENTS } from "@/lib/vax";
import { DEFAULT_WAIVER } from "@/lib/defaults";
import { onboardingSchema } from "@/lib/validation";

export type OnboardingState = { error?: string } | undefined;

/**
 * Turns a fresh Clerk signup into a Business row, seeded with the default
 * vaccine requirements and a starter waiver so the intake link works
 * immediately (spec §11: sign up, set required vaxes, copy the link).
 */
export async function createBusiness(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const existing = await prisma.business.findUnique({
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
    return { error: "Please enter a business name and a valid email address." };
  }

  const slug = await uniqueSlug(parsed.data.name, async (candidate) => {
    const hit = await prisma.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return hit !== null;
  });

  await prisma.business.create({
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
