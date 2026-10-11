// The one file to edit for the tool's name and copy.
// Everything user-facing that names the tool reads from here.
export const site = {
  name: "Pawperwork",
  description:
    "One intake link for groomers, boarders, daycares and walkers. Collect pet profiles, " +
    "vaccination records and signed waivers, and stop chasing expired paperwork.",
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
