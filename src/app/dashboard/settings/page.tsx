import { AuditTimeline } from "@/components/activity/audit-timeline";
import { IntakeLink } from "@/components/dashboard/intake-link";
import { Panel } from "@/components/dashboard/panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { WaiverEditor } from "@/components/settings/waiver-editor";
import { requireBusiness } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getBusinessAuditLog } from "@/lib/server/queries";
import { parseVaxRequirements } from "@/lib/vax";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const business = await requireBusiness();
  const [waivers, activity] = await Promise.all([
    db.waiver.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, bodyMarkdown: true, version: true, _count: { select: { signatures: true } } },
    }),
    getBusinessAuditLog(business.id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <span className="label text-mute">{business.name}</span>
          <h1 className="display text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-mute">Your profile, which vaccinations you require, and your waivers.</p>
        </div>
        <IntakeLink slug={business.slug} />
      </div>

      <SettingsForm
        business={{
          name: business.name,
          email: business.email,
          phone: business.phone ?? "",
          address: business.address ?? "",
          logoUrl: business.logoUrl ?? "",
          vaxRequirements: parseVaxRequirements(business.vaxRequirements),
        }}
      />

      <WaiverEditor
        n="03"
        waivers={waivers.map((waiver) => ({
          id: waiver.id,
          title: waiver.title,
          bodyMarkdown: waiver.bodyMarkdown,
          version: waiver.version,
          signatureCount: waiver._count.signatures,
        }))}
      />

      <Panel n="04" title="Recent changes">
        <AuditTimeline entries={activity} emptyLabel="No changes recorded yet." />
      </Panel>
    </div>
  );
}
