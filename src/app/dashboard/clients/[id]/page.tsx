import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileCheck,
  FileSignature,
  History,
  PawPrint,
} from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { getClientAuditLog, getClientDetail } from "@/lib/queries";
import { formatDate } from "@/lib/email";
import { VaxStatusBadge } from "@/components/ui/vax-status-badge";
import { RemindButton } from "@/components/ui/remind-button";
import { ResendIntakeButton } from "@/components/ui/resend-intake-button";
import { VerifyButton } from "@/components/ui/verify-button";
import { DetailField } from "@/components/ui/detail-field";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { currentRecordForType } from "@/lib/vax";
import { speciesIcon } from "@/lib/pet-icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/clients/[id]">) {
  const business = await requireBusiness();
  const { id } = await params;
  const detail = await getClientDetail(business.id, id);
  if (!detail) return { title: "Client not found" };
  return {
    title: `${detail.client.firstName} ${detail.client.lastName}`,
  };
}

export default async function ClientDetailPage({
  params,
}: PageProps<"/dashboard/clients/[id]">) {
  const business = await requireBusiness();
  const { id } = await params;
  const [detail, activity] = await Promise.all([
    getClientDetail(business.id, id),
    getClientAuditLog(business.id, id),
  ]);
  if (!detail) notFound();

  const { client, pets, waivers } = detail;
  const signedWaiverIds = new Set(
    client.waiverSignatures.map((signature) => signature.waiverId),
  );
  const unsigned = waivers.filter((waiver) => !signedWaiverIds.has(waiver.id));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/clients"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All clients
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
              {client.firstName[0]}
              {client.lastName[0]}
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {client.firstName} {client.lastName}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {client.email}
                {client.phone ? ` · ${client.phone}` : ""} · submitted{" "}
                {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <VaxStatusBadge status={detail.status} className="self-center" />
            <RemindButton clientId={client.id} />
            <ResendIntakeButton clientId={client.id} />
            {/* Streams the PDF packet (spec §3). */}
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/api/clients/${client.id}/packet`} />}
            >
              <Download className="size-4" aria-hidden />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          <PawPrint className="size-4 text-primary" aria-hidden />
          Pets <span className="font-normal text-muted-foreground">({pets.length})</span>
        </h2>
        {pets.map((pet) => {
          const SpeciesIcon = speciesIcon(pet.species);
          return (
          <Card key={pet.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <SpeciesIcon className="size-4" aria-hidden />
                  </span>
                  <CardTitle className="text-base">
                    {pet.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ""}
                    </span>
                  </CardTitle>
                </div>
                <VaxStatusBadge status={pet.summary.overall} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-x-8 sm:grid-cols-2">
                <DetailField
                  label="Date of birth"
                  value={pet.birthDate ? formatDate(pet.birthDate) : null}
                />
                <DetailField
                  label="Weight"
                  value={pet.weight ? `${pet.weight} lb` : null}
                />
                <DetailField label="Color" value={pet.color} />
                <DetailField
                  label="Vet"
                  value={[pet.vetName, pet.vetPhone].filter(Boolean).join(" · ") || null}
                />
                <DetailField
                  label="Emergency"
                  value={
                    [pet.emergencyName, pet.emergencyPhone]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                />
              </dl>

              {pet.behaviorNotes || pet.medicalNotes ? (
                <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                  {pet.behaviorNotes ? (
                    <p>
                      <span className="font-medium">Behavior: </span>
                      {pet.behaviorNotes}
                    </p>
                  ) : null}
                  {pet.medicalNotes ? (
                    <p>
                      <span className="font-medium">Medical: </span>
                      {pet.medicalNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">Vaccinations</h3>
                <ul className="divide-y">
                  {pet.summary.byType.map((entry) => {
                    const record = currentRecordForType(
                      pet.vaccinations,
                      entry.type,
                    );
                    return (
                      <li
                        key={entry.type}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5"
                      >
                        <div className="min-w-40 flex-1">
                          <p className="text-sm font-medium">
                            {entry.type}
                            {entry.required ? null : (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                optional
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.expiresAt
                              ? `Expires ${formatDate(entry.expiresAt)}`
                              : "No expiry date on file"}
                            {record?.administeredAt
                              ? ` · given ${formatDate(record.administeredAt)}`
                              : ""}
                          </p>
                        </div>
                        <VaxStatusBadge status={entry.status} />
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
                            {entry.verified ? (
                              <Badge variant="secondary">Verified</Badge>
                            ) : null}
                            <VerifyButton
                              vaccinationId={record.id}
                              verified={entry.verified}
                            />
                          </>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          <FileSignature className="size-4 text-primary" aria-hidden />
          Waivers
        </h2>
        {client.waiverSignatures.length === 0 && unsigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This business has no waivers configured.
          </p>
        ) : null}

        {client.waiverSignatures.map((signature) => {
          const waiver = waivers.find((w) => w.id === signature.waiverId);
          const superseded =
            waiver !== undefined && waiver.version !== signature.waiverVersion;
          return (
            <Card key={signature.id}>
              <CardContent className="flex items-start gap-3 py-4 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <FileCheck className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{signature.waiver.title}</p>
                    {/* Signatures stay pinned to the version signed (spec §9). */}
                    <Badge variant="outline">v{signature.waiverVersion}</Badge>
                    {superseded ? (
                      <span className="text-xs text-muted-foreground">
                        waiver is now v{waiver?.version}
                      </span>
                    ) : null}
                  </div>
                  <p>
                    Signed{" "}
                    <span className="font-medium">{signature.signatureText}</span>{" "}
                    on {signature.signedAt.toISOString()}
                  </p>
                  <p className="text-xs break-all text-muted-foreground">
                    IP {signature.ipAddress ?? "unknown"} · SHA-256{" "}
                    {signature.documentHash}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {unsigned.map((waiver) => (
          <Card key={waiver.id} className="border border-dashed ring-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  <FileSignature className="size-3.5" aria-hidden />
                </span>
                <p>
                  <span className="font-medium">{waiver.title}</span>{" "}
                  <span className="text-muted-foreground">
                    (v{waiver.version}) — not signed
                  </span>
                </p>
              </div>
              <ResendIntakeButton clientId={client.id} />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          <History className="size-4 text-primary" aria-hidden />
          Activity
        </h2>
        <Card>
          <CardContent className="pt-6">
            <AuditTimeline
              entries={activity}
              emptyLabel="No activity recorded for this client yet."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
