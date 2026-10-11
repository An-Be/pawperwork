import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatDate } from "./email";
import { STATUS_LABEL, currentRecordForType } from "./vax";
import type { getClientDetail } from "./queries";

/**
 * PDF intake packet (spec §3, §11): profile, vaccination records, and the
 * signed waiver text as it was signed.
 *
 * Kept separate from the route handler so the document can be rendered and
 * inspected without going through auth.
 */

export type PacketDetail = NonNullable<
  Awaited<ReturnType<typeof getClientDetail>>
>;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#111827", lineHeight: 1.5 },
  header: {
    marginBottom: 18,
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 10,
  },
  businessName: { fontSize: 16, fontWeight: 700 },
  meta: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 10, marginBottom: 3 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, color: "#6b7280" },
  value: { flex: 1 },
  tableHead: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 3,
    marginBottom: 3,
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  cell: { flex: 1, paddingRight: 6 },
  waiverBody: {
    marginTop: 4,
    padding: 8,
    backgroundColor: "#f9fafb",
    fontSize: 9,
    color: "#374151",
  },
  footer: { marginTop: 10, fontSize: 8, color: "#6b7280" },
  notes: { color: "#374151" },
});

/**
 * Waiver bodies are markdown, but @react-pdf has no markdown renderer. Flatten
 * the common syntax so the packet reads as plain prose instead of printing
 * literal "##" and "**" to a document someone may file or hand to a lawyer.
 */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

/** Administered date of the record currently governing a type. */
function administeredFor(
  vaccinations: { type: string; administeredAt: Date | null; expiresAt: Date | null }[],
  type: string,
): string {
  const record = currentRecordForType(vaccinations, type);
  return record?.administeredAt ? formatDate(record.administeredAt) : "—";
}

export function IntakePacketDocument({
  businessName,
  detail,
  generatedAt,
}: {
  businessName: string;
  detail: PacketDetail;
  generatedAt: Date;
}) {
  const { client, pets, waivers } = detail;
  const waiverById = new Map(waivers.map((waiver) => [waiver.id, waiver]));

  return (
    <Document
      title={`Intake packet — ${client.firstName} ${client.lastName}`}
      author={businessName}
    >
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.meta}>
            Intake packet · generated {formatDate(generatedAt)}
          </Text>
        </View>

        <Text style={styles.h2}>Owner</Text>
        <Field label="Name" value={`${client.firstName} ${client.lastName}`} />
        <Field label="Email" value={client.email} />
        <Field label="Phone" value={client.phone ?? ""} />
        <Field label="Submitted" value={formatDate(client.createdAt)} />

        {pets.map((pet) => (
          <View key={pet.id} wrap={false}>
            <Text style={styles.h2}>
              {pet.name} ({pet.species})
            </Text>
            <Field label="Breed" value={pet.breed ?? ""} />
            <Field
              label="Date of birth"
              value={pet.birthDate ? formatDate(pet.birthDate) : ""}
            />
            <Field
              label="Weight"
              value={pet.weight ? `${pet.weight} lb` : ""}
            />
            <Field label="Color" value={pet.color ?? ""} />
            <Field
              label="Vet"
              value={[pet.vetName, pet.vetPhone].filter(Boolean).join(" · ")}
            />
            <Field
              label="Emergency"
              value={[pet.emergencyName, pet.emergencyPhone]
                .filter(Boolean)
                .join(" · ")}
            />
            {pet.behaviorNotes ? (
              <>
                <Text style={styles.h3}>Behavior notes</Text>
                <Text style={styles.notes}>{pet.behaviorNotes}</Text>
              </>
            ) : null}
            {pet.medicalNotes ? (
              <>
                <Text style={styles.h3}>Medical notes</Text>
                <Text style={styles.notes}>{pet.medicalNotes}</Text>
              </>
            ) : null}

            <Text style={styles.h3}>Vaccinations</Text>
            <View style={styles.tableHead}>
              <Text style={styles.cell}>Type</Text>
              <Text style={styles.cell}>Administered</Text>
              <Text style={styles.cell}>Expires</Text>
              <Text style={styles.cell}>Status</Text>
              <Text style={styles.cell}>Verified</Text>
            </View>
            {pet.summary.byType.map((entry) => (
              <View key={entry.type} style={styles.tableRow}>
                <Text style={styles.cell}>
                  {entry.type}
                  {entry.required ? "" : " (optional)"}
                </Text>
                <Text style={styles.cell}>
                  {administeredFor(pet.vaccinations, entry.type)}
                </Text>
                <Text style={styles.cell}>
                  {entry.expiresAt ? formatDate(entry.expiresAt) : "—"}
                </Text>
                <Text style={styles.cell}>{STATUS_LABEL[entry.status]}</Text>
                <Text style={styles.cell}>{entry.verified ? "Yes" : "No"}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.h2}>Signed waivers</Text>
        {client.waiverSignatures.length === 0 ? (
          <Text style={styles.notes}>No waivers signed.</Text>
        ) : (
          client.waiverSignatures.map((signature) => {
            const waiver = waiverById.get(signature.waiverId);
            const isCurrentVersion = waiver?.version === signature.waiverVersion;
            return (
              <View key={signature.id} wrap={false}>
                <Text style={styles.h3}>
                  {signature.waiver.title} (signed v{signature.waiverVersion}
                  {isCurrentVersion ? "" : `, waiver is now v${waiver?.version}`})
                </Text>
                <Field label="Signed by" value={signature.signatureText} />
                <Field
                  label="Signed at"
                  value={signature.signedAt.toISOString()}
                />
                <Field label="IP address" value={signature.ipAddress ?? ""} />
                <Field label="User agent" value={signature.userAgent ?? ""} />
                <Field label="SHA-256" value={signature.documentHash} />
                {isCurrentVersion && waiver ? (
                  <Text style={styles.waiverBody}>
                    {markdownToPlainText(waiver.bodyMarkdown)}
                  </Text>
                ) : (
                  <Text style={styles.waiverBody}>
                    This signature is pinned to version {signature.waiverVersion}.
                    The waiver has since been edited, so the current text is not
                    the text that was signed. The SHA-256 above identifies the
                    exact document version signed.
                  </Text>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          Vaccination status is computed from expiry dates at the time this
          packet was generated ({formatDate(generatedAt)}).
        </Text>
      </Page>
    </Document>
  );
}

export async function renderIntakePacket(
  businessName: string,
  detail: PacketDetail,
  generatedAt = new Date(),
): Promise<Buffer> {
  return renderToBuffer(
    <IntakePacketDocument
      businessName={businessName}
      detail={detail}
      generatedAt={generatedAt}
    />,
  );
}

export function packetFilename(detail: PacketDetail): string {
  return (
    `intake-${detail.client.lastName}-${detail.client.firstName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-") + ".pdf"
  );
}
