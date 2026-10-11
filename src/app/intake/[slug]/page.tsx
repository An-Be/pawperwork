import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intake/intake-form";
import { IntakeHeader } from "@/components/intake/intake-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Shell } from "@/components/ui/shell";
import { db } from "@/lib/server/db";
import { parseSlug } from "@/lib/validation";
import { parseVaxRequirements } from "@/lib/vax";

async function loadBusiness(rawSlug: string) {
  const slug = parseSlug(rawSlug);
  if (!slug) return null;
  return db.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      vaxRequirements: true,
      waivers: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, bodyMarkdown: true, version: true },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/intake/[slug]">): Promise<Metadata> {
  const business = await loadBusiness((await params).slug);
  if (!business) return { title: "Intake form not found" };
  return {
    title: `${business.name}: new client intake`,
    description: `Send ${business.name} your pet's details, vaccination records and signed waivers.`,
    // Intake links are handed out by the business, not indexed.
    robots: { index: false, follow: false },
  };
}

/** Public, unauthenticated: the link a business hands its clients. */
export default async function IntakePage({ params }: PageProps<"/intake/[slug]">) {
  const business = await loadBusiness((await params).slug);
  if (!business) notFound();

  return (
    <Shell>
      <main className="flex flex-1 flex-col gap-8 py-8">
        <IntakeHeader name={business.name} logoUrl={business.logoUrl} />
        <IntakeForm
          business={{ name: business.name, slug: business.slug }}
          requirements={parseVaxRequirements(business.vaxRequirements)}
          waivers={business.waivers}
        />
      </main>
      <SiteFooter />
    </Shell>
  );
}
