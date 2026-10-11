import Link from "next/link";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Intake submitted",
  robots: { index: false, follow: false },
};

export default async function IntakeSuccessPage({
  params,
}: PageProps<"/intake/[slug]/success">) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, email: true, phone: true },
  });
  if (!business) notFound();

  return (
    <main className="bg-warm-glow flex min-h-full flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <PartyPopper className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">
          You&apos;re all set!
        </h1>
        <p className="mt-3 text-muted-foreground">
          {business.name} has received your intake form. A confirmation is on
          its way to your email.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Need to change something, or add another pet? Contact{" "}
          {business.phone ? (
            <a
              className="font-medium text-primary underline underline-offset-4"
              href={`tel:${business.phone}`}
            >
              {business.phone}
            </a>
          ) : (
            <a
              className="font-medium text-primary underline underline-offset-4"
              href={`mailto:${business.email}`}
            >
              {business.email}
            </a>
          )}
          , or{" "}
          <Link
            href={`/intake/${slug}`}
            className="font-medium text-primary underline underline-offset-4"
          >
            submit the form again
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
