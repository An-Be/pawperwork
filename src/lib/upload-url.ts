// Vaccination record links come from the public intake form and are shown to the
// business as "View record", so they must point at our own upload storage, not
// an arbitrary site a stranger chose. (Copied from TabMath's receipt-url.ts.)

const ALLOWED_HOST_SUFFIXES = [".ufs.sh"] as const;
const ALLOWED_HOSTS = ["utfs.io"] as const;

/** True only for https URLs on Uploadthing's file hosts. */
export function isUploadthingFileUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return (
    (ALLOWED_HOSTS as readonly string[]).includes(host) ||
    ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length)
  );
}
