import Link from "next/link";
import {
  CircleAlert,
  ClockAlert,
  CircleHelp,
  FileSignature,
  PartyPopper,
  PawPrint,
} from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getOverview } from "@/lib/queries";
import { appUrl, formatDate } from "@/lib/email";
import { CopyLink } from "@/components/ui/copy-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Overview" };

/** Reads live counts on every request — vax status is derived (spec §9). */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const business = await requireBusiness();
  const overview = await getOverview(business.id);

  const cards = [
    {
      label: "Expired",
      value: overview.expired,
      hint: "pets with a required vaccination past its expiry date",
      icon: CircleAlert,
      tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    },
    {
      label: "Expiring soon",
      value: overview.expiring,
      hint: "pets with a required vaccination due within 30 days",
      icon: ClockAlert,
      tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    {
      label: "Missing",
      value: overview.missing,
      hint: "pets with no record on file, or a record with no expiry date",
      icon: CircleHelp,
      tone: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    },
    {
      label: "Unsigned waivers",
      value: overview.clientsWithUnsignedWaivers,
      hint: "clients who have not signed every waiver",
      icon: FileSignature,
      tone: "bg-accent text-accent-foreground",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {overview.totalClients} client
            {overview.totalClients === 1 ? "" : "s"} · {overview.totalPets} pet
            {overview.totalPets === 1 ? "" : "s"}
          </p>
        </div>
        <div className="w-full max-w-md">
          <CopyLink
            label="Your intake link"
            url={appUrl(`/intake/${business.slug}`)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${card.tone}`}
                >
                  <card.icon className="size-4" aria-hidden />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-extrabold tabular-nums">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {overview.unverified > 0 ? (
        <Card className="bg-accent/30 ring-accent">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="flex items-center gap-2 text-sm">
              <CircleHelp
                className="size-4 shrink-0 text-accent-foreground"
                aria-hidden
              />
              <span>
                <span className="font-medium">
                  {overview.unverified} uploaded record
                  {overview.unverified === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-muted-foreground">
                  not yet verified against the certificate.
                </span>
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/clients" />}
            >
              Review
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PartyPopper className="size-4 text-primary" aria-hidden />
            Recent intakes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentIntakes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <PawPrint className="size-5" aria-hidden />
              </span>
              <p className="text-sm text-muted-foreground">
                No intakes yet. Share your intake link to get the first one.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {overview.recentIntakes.map((intake) => (
                <li
                  key={intake.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <PawPrint className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/clients/${intake.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {intake.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {intake.petNames.join(", ") || "No pets"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {formatDate(intake.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
