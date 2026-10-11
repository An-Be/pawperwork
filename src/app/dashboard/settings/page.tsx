import { History } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessAuditLog } from "@/lib/queries";
import { parseVaxRequirements } from "@/lib/vax";
import { appUrl } from "@/lib/email";
import { CopyLink } from "@/components/ui/copy-link";
import { AuditTimeline } from "@/components/ui/audit-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { WaiverEditor } from "./waiver-editor";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business = await requireBusiness();
  const [waivers, activity] = await Promise.all([
    prisma.waiver.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { signatures: true } } },
    }),
    getBusinessAuditLog(business.id),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile, which vaccinations you require, and your waivers.
        </p>
      </div>

      <div className="max-w-xl">
        <CopyLink
          label="Your public intake link"
          url={appUrl(`/intake/${business.slug}`)}
        />
      </div>

      <Separator />

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

      <Separator />

      <WaiverEditor
        waivers={waivers.map((waiver) => ({
          id: waiver.id,
          title: waiver.title,
          bodyMarkdown: waiver.bodyMarkdown,
          version: waiver.version,
          signatureCount: waiver._count.signatures,
        }))}
      />

      <Separator />

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          <History className="size-4 text-primary" aria-hidden />
          Recent changes
        </h2>
        <Card>
          <CardContent className="pt-6">
            <AuditTimeline
              entries={activity}
              emptyLabel="No changes recorded yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
