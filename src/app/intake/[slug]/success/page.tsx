import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { Shell } from "@/components/ui/shell";
import { db } from "@/lib/server/db";
import { parseSlug } from "@/lib/validation";

export const metadata = { title: "Intake sent", robots: { index: false, follow: false } };

export default async function IntakeSuccessPage({ params }: PageProps<"/intake/[slug]/success">) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const business = await db.business.findUnique({
    where: { slug },
    select: { name: true, email: true, phone: true },
  });
  if (!business) notFound();

  const link = "text-ink underline underline-offset-2";
  return (
    <Shell>
      <main className="flex flex-1 flex-col justify-center gap-6 py-10">
        <p className="label text-mute">Sent</p>
        <h1 className="display text-5xl">You&apos;re all set.</h1>
        <p className="text-sm text-mute">
          {business.name} has your intake form. A confirmation is on its way to your email.
        </p>
        <p className="text-sm text-mute">
          Need to change something, or add another pet? Contact{" "}
          {business.phone ? (
            <a className={link} href={`tel:${business.phone}`}>
              {business.phone}
            </a>
          ) : (
            <a className={link} href={`mailto:${business.email}`}>
              {business.email}
            </a>
          )}
          , or{" "}
          <Link href={`/intake/${slug}`} className={link}>
            fill in the form again
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
