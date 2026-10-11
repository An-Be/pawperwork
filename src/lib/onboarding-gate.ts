/**
 * Who may create a business. While sign-ups are closed (`site.signupsOpen`),
 * only emails listed in ONBOARDING_ALLOWLIST (comma-separated, any case) can
 * finish onboarding, so the owner can still set up test accounts. Clerk can
 * still create a user through its own pages; this keeps that user from getting
 * a business.
 */
export function canOnboard(email: string, signupsOpen: boolean, allowlist: string | undefined): boolean {
  if (signupsOpen) return true;
  const normalized = email.trim().toLowerCase();
  if (!normalized || !allowlist) return false;
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry !== "" && entry === normalized);
}
