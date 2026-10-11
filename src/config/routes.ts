/**
 * Path prefixes whose next segment is an identifier we keep out of logs and
 * analytics (src/lib/csp-report.ts, src/lib/analytics.ts). Pawperwork has no
 * secret links (intake slugs are public by design), but client, vaccination
 * and waiver ids belong to a business's private records.
 * Keep in sync with the privateHeaders entries in next.config.ts.
 */
export const secretPathPrefixes = [
  "/dashboard/clients/",
  "/api/clients/",
  "/api/vaccinations/",
  "/api/waivers/",
] as const;
