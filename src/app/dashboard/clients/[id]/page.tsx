import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditTimeline } from "@/components/activity/audit-timeline";
import { DetailField } from "@/components/clients/detail-field";
import { RemindButton } from "@/components/clients/remind-button";
import { ResendIntakeButton } from "@/components/clients/resend-intake-button";
import { VerifyButton } from "@/components/clients/verify-button";
import { Panel } from "@/components/dashboard/panel";
import { VaxStatusTag } from "@/components/vax/vax-status";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { requireBusiness } from "@/lib/server/auth";
import { getClientAuditLog, getClientDetail } from "@/lib/server/queries";
import { parseId } from "@/lib/validation";
import { currentRecordForType } from "@/lib/vax";

// Never a client's name: page titles end up in browser history and analytics.
export const metadata = { title: "Client" };

function joined(...parts: (string | null)[]) {
  return parts.filter(Boolean).join(" · ") || null;
}

export default async function ClientDetailPage({ params }: PageProps<"/dashboard/clients/[id]">) {
  const business = await requireBusiness();
  const clientId = parseId((await params).id);
  if (!clientId) notFound();
  const [detail, activity] = await Promise.all([
    getClientDetail(business.id, clientId),
    getClientAuditLog(business.id, clientId),
  ]);
  if (!detail) notFound();

  const { client, pets, waivers } = detail;
  const signedWaiverIds = new Set(client.waiverSignatures.map((signature) => signature.waiverId));
  const unsigned = waivers.filter((waiver) => !signedWaiverIds.has(waiver.id));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/clients" className="label w-fit text-mute hover:text-ink">
          ← All clients
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-4xl">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-2 text-sm text-mute">
              {client.email}
              {client.phone ? ` · ${client.phone}` : ""} · submitted {formatDate(client.createdAt)}
            </p>
          </div>
          <VaxStatusTag status={detail.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <RemindButton clientId={client.id} />
          <ResendIntakeButton clientId={client.id} />
          {/* A plain <a>: next/link would client-navigate instead of downloading the PDF. */}
          <a href={`/api/clients/${client.id}/packet`} className={buttonVariants({ variant: "outline" })}>
            Export PDF
          </a>
        </div>
      </div>

      <section className="flex flex-col gap-6">
        {pets.map((pet, index) => (
          <Panel
            key={pet.id}
            n={String(index + 1).padStart(2, "0")}
            title={`${pet.name} · ${pet.species}${pet.breed ? ` · ${pet.breed}` : ""}`}
            aside={<VaxStatusTag status={pet.summary.overall} />}
            className="flex flex-col gap-5"
          >
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <DetailField label="Born" value={pet.birthDate ? formatDate(pet.birthDate) : null} />
              <DetailField label="Weight" value={pet.weight ? `${pet.weight} lb` : null} />
              <DetailField label="Color" value={pet.color} />
              <DetailField label="Vet" value={joined(pet.vetName, pet.vetPhone)} />
              <DetailField label="Emergency" value={joined(pet.emergencyName, pet.emergencyPhone)} />
            </dl>

            {pet.behaviorNotes || pet.medicalNotes ? (
              <div className="flex flex-col gap-2 bg-wash p-3 text-sm">
                {pet.behaviorNotes ? (
                  <p>
                    <span className="label mr-2">Behavior</span>
                    {pet.behaviorNotes}
                  </p>
                ) : null}
                {pet.medicalNotes ? (
                  <p>
                    <span className="label mr-2">Medical</span>
                    {pet.medicalNotes}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <h3 className="label mb-2 text-mute">Vaccinations</h3>
              <ul className="divide-y divide-rule border-t border-rule">
                {pet.summary.byType.map((entry) => {
                  const record = currentRecordForType(pet.vaccinations, entry.type);
                  return (
                    <li key={entry.type} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <div className="min-w-40 flex-1">
                        <p className="text-sm font-medium">
                          {entry.type}
                          {entry.required ? null : <span className="label ml-2 text-mute">optional</span>}
                        </p>
                        <p className="text-xs text-mute">
                          {entry.expiresAt ? `Expires ${formatDate(entry.expiresAt)}` : "No expiry date on file"}
                          {record?.administeredAt ? ` · given ${formatDate(record.administeredAt)}` : ""}
                        </p>
                      </div>
                      <VaxStatusTag status={entry.status} />
                      {record?.documentUrl ? (
                        <a
                          href={record.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline underline-offset-4"
                        >
                          View record
                        </a>
                      ) : null}
                      {record ? (
                        <>
                          {entry.verified ? <span className="label text-mute">Verified</span> : null}
                          <VerifyButton vaccinationId={record.id} verified={entry.verified} />
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Panel>
        ))}
      </section>

      <Panel n={String(pets.length + 1).padStart(2, "0")} title="Waivers" className="flex flex-col gap-4">
        {client.waiverSignatures.length === 0 && unsigned.length === 0 ? (
          <p className="text-sm text-mute">You don&apos;t have any waivers set up.</p>
        ) : null}

        {client.waiverSignatures.map((signature) => {
          const waiver = waivers.find((w) => w.id === signature.waiverId);
          const superseded = waiver !== undefined && waiver.version !== signature.waiverVersion;
          return (
            <div key={signature.id} className="flex flex-col gap-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{signature.waiver.title}</p>
                {/* Signatures stay pinned to the version signed. */}
                <span className="label border border-ink px-2 py-0.5">v{signature.waiverVersion}</span>
                {superseded ? <span className="text-xs text-mute">waiver is now v{waiver?.version}</span> : null}
              </div>
              <p>
                Signed <span className="font-medium">{signature.signatureText}</span> on{" "}
                {signature.signedAt.toISOString()}
              </p>
              <p className="text-xs break-all text-mute">
                IP {signature.ipAddress ?? "unknown"} · SHA-256 {signature.documentHash}
              </p>
            </div>
          );
        })}

        {unsigned.map((waiver) => (
          <div
            key={waiver.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-ink p-3 text-sm"
          >
            <p>
              <span className="font-medium">{waiver.title}</span>{" "}
              <span className="text-mute">(v{waiver.version}) not signed</span>
            </p>
            <ResendIntakeButton clientId={client.id} size="sm" />
          </div>
        ))}
      </Panel>

      <Panel n={String(pets.length + 2).padStart(2, "0")} title="Activity">
        <AuditTimeline entries={activity} emptyLabel="No activity recorded for this client yet." />
      </Panel>
    </div>
  );
}
