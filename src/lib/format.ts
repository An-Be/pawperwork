// Formatting shared by server pages, emails and the PDF packet. Pure, so it is
// safe on the client too.

/** Absolute URL for a path, e.g. the public intake link in an email. */
export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

/** Dates are stored as midnight UTC (vaccination dates are whole days), so format in UTC. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
