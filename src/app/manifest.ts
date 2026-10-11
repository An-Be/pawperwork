import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// TODO: add PNG icons (192, 512, maskable) to public/ for the home screen;
// see docs/modules and the template's docs/new-tool.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    // No start_url: it then defaults to the page the person added to their Home
    // Screen from, so secret-link pages (/t/<token>) open themselves.
    display: "standalone",
    background_color: site.themeColor,
    theme_color: site.themeColor,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
