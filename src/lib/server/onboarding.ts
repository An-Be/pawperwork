import "server-only";
import { site } from "@/config/site";
import { canOnboard } from "@/lib/onboarding-gate";

/**
 * Whether this signed-in email may create a business. Pass the email Clerk
 * verified, never the one typed into the onboarding form.
 */
export function onboardingAllowed(verifiedEmail: string): boolean {
  return canOnboard(verifiedEmail, site.signupsOpen, process.env.ONBOARDING_ALLOWLIST);
}
