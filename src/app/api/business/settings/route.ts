import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { businessSettingsSchema } from "@/lib/validation";
import { parseVaxRequirements } from "@/lib/vax";

// Only the fields the settings screen shows. Never the Clerk user id.
const settingsSelect = {
  name: true,
  slug: true,
  email: true,
  phone: true,
  address: true,
  logoUrl: true,
  vaxRequirements: true,
} as const;

export async function GET() {
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const business = await db.business.findUniqueOrThrow({
    where: { id: auth.business.id },
    select: settingsSelect,
  });
  return json({ ...business, vaxRequirements: parseVaxRequirements(business.vaxRequirements) });
}

export async function PATCH(req: Request) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;
  const body = await parseJsonBody(req, businessSettingsSchema, 16 * 1024);
  if (!body.ok) return body.response;
  const { vaxRequirements, logoUrl, ...rest } = body.data;

  const updated = await db.business.update({
    where: { id: business.id },
    data: {
      ...rest,
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
      // Normalised on write so reads never have to trust the Json column.
      ...(vaxRequirements ? { vaxRequirements: parseVaxRequirements(vaxRequirements) } : {}),
    },
    select: settingsSelect,
  });

  // Which top-level fields actually changed: field names, not before/after
  // values, which would just duplicate PII already in the Business row.
  const changedFields: string[] = (Object.keys(rest) as (keyof typeof rest)[]).filter(
    (key) => business[key] !== updated[key],
  );
  if (logoUrl !== undefined) changedFields.push("logoUrl");
  if (vaxRequirements) changedFields.push("vaxRequirements");

  if (changedFields.length > 0) {
    await recordAudit({
      businessId: business.id,
      action: "business.settings_update",
      targetType: "Business",
      targetId: business.id,
      metadata: {
        changedFields,
        // Required-vax changes affect compliance and reminders, so worth the
        // full new value; everything else is just a field name.
        ...(vaxRequirements ? { vaxRequirements: parseVaxRequirements(vaxRequirements) } : {}),
      },
    });
  }

  return json({ ...updated, vaxRequirements: parseVaxRequirements(updated.vaxRequirements) });
}
