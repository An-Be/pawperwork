import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { parseVaxRequirements } from "@/lib/vax";
import { IntakeForm } from "./intake-form";

/** Public, unauthenticated route (spec §5). */
export const dynamic = "force-dynamic";

async function loadBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      phone: true,
      vaxRequirements: true,
      waivers: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, bodyMarkdown: true, version: true },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/intake/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business) return { title: "Intake form not found" };
  return {
    title: `${business.name} — new client intake`,
    description: `Submit your pet's details, vaccination records and signed waivers for ${business.name}.`,
    // Intake links are handed out by the business, not indexed.
    robots: { index: false, follow: false },
  };
}

export default async function IntakePage({
  params,
}: PageProps<"/intake/[slug]">) {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business) notFound();

  return (
    <IntakeForm
      business={{
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl,
        phone: business.phone,
      }}
      requirements={parseVaxRequirements(business.vaxRequirements)}
      waivers={business.waivers}
    />
  );
}
