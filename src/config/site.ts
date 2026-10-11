// The one file to edit for the tool's name and copy.
// Everything user-facing that names the tool reads from here.
export const site = {
  name: "Pawperwork",
  /** Browser tab and search result title: brand first, then the plain-language promise. Under 60 chars. */
  title: "Pawperwork: Intake and Vax Tracking for Pet Care",
  /** Search result snippet and link previews. Under 160 chars. */
  description:
    "One intake link for your grooming, boarding, or daycare business. Owners submit profiles, " +
    "upload vax records, and e-sign waivers from their phone.",
  /**
   * New business sign-ups. Off until transactional email (Resend) is set up, since
   * reminders and invites depend on it. Sign-in keeps working for existing accounts.
   */
  signupsOpen: false,
  /** Shown in the footer. Keep it short. */
  tagline: "Pet paperwork, handled.",
  /** Footer credit link. */
  author: { name: "Andrea", url: "https://andreaberrocal.com" },
  /** Browser UI color. Paper white keeps the monochrome look. */
  themeColor: "#ffffff",
  /**
   * The landing page is meant to be found. Pages that shouldn't be indexed
   * (intake forms, the dashboard) opt out on their own: per-page `robots`
   * metadata plus the privateHeaders in next.config.ts.
   */
  indexable: true,
} as const;
