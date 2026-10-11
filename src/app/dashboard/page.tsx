import Link from "next/link";
import { IntakeLink } from "@/components/dashboard/intake-link";
import { Panel } from "@/components/dashboard/panel";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { requireBusiness } from "@/lib/server/auth";
import { getOverview } from "@/lib/server/queries";

export const metadata = { title: "Overview" };

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Vaccination status is derived from dates on every request, never stored. */
export default async function DashboardPage() {
  const business = await requireBusiness();
  const overview = await getOverview(business.id);

  const counts = [
    { label: "Expired", value: overview.expired, hint: "pets with a required vaccination past its expiry date" },
    { label: "Expiring soon", value: overview.expiring, hint: "pets with a required vaccination due within 30 days" },
    { label: "Missing", value: overview.missing, hint: "pets with no record on file, or one with no expiry date" },
    {
      label: "Unsigned waivers",
      value: overview.clientsWithUnsignedWaivers,
      hint: "clients who haven't signed every waiver",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <span className="label text-mute">{business.name}</span>
          <h1 className="display text-4xl">Overview</h1>
          <p className="mt-2 text-sm text-mute">
            {plural(overview.totalClients, "client")} · {plural(overview.totalPets, "pet")}
          </p>
        </div>
        <IntakeLink slug={business.slug} />
      </div>

      <section>
        <ul className="grid grid-cols-2 gap-px border border-ink bg-ink lg:grid-cols-4">
          {counts.map((count) => (
            <li key={count.label} className="flex flex-col gap-2 bg-paper p-5">
              <span className="label text-mute">{count.label}</span>
              <span className="display text-5xl">{count.value}</span>
              <span className="text-xs text-mute">{count.hint}</span>
            </li>
          ))}
        </ul>
      </section>

      {overview.unverified > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink px-4 py-3">
          <p className="text-sm">
            {plural(overview.unverified, "uploaded record")} not yet checked against the certificate.
          </p>
          <Link href="/dashboard/clients" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Review
          </Link>
        </div>
      ) : null}

      <Panel n="01" title="Recent intakes">
        {overview.recentIntakes.length === 0 ? (
          <p className="text-sm text-mute">No intakes yet. Share your intake link to get the first one.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {overview.recentIntakes.map((intake) => (
              <li key={intake.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/clients/${intake.id}`}
                    className="font-display text-lg font-medium tracking-[-0.02em] underline-offset-4 hover:underline"
                  >
                    {intake.name}
                  </Link>
                  <p className="truncate text-sm text-mute">{intake.petNames.join(", ") || "No pets"}</p>
                </div>
                <span className="label shrink-0 text-mute">{formatDate(intake.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
