import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseBody } from "@/lib/route-input";
import { businessSettingsSchema } from "@/lib/validation";
import { parseVaxRequirements } from "@/lib/vax";
import { recordAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    return Response.json({
      ...business,
      vaxRequirements: parseVaxRequirements(business.vaxRequirements),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    const { vaxRequirements, logoUrl, ...rest } = parseBody(
      businessSettingsSchema,
      await request.json(),
    );

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...rest,
        ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
        // Normalised on write so reads never have to trust the Json column.
        ...(vaxRequirements
          ? { vaxRequirements: parseVaxRequirements(vaxRequirements) }
          : {}),
      },
    });

    // Which top-level fields actually changed — not full before/after values,
    // which would just duplicate PII that's already in the Business row.
    const changedFields = Object.keys(rest).filter(
      (key) =>
        (business as Record<string, unknown>)[key] !==
        (updated as Record<string, unknown>)[key],
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
          // Required-vax changes affect compliance/reminders, so worth the
          // full new value; everything else is just a field name.
          ...(vaxRequirements
            ? { vaxRequirements: parseVaxRequirements(vaxRequirements) }
            : {}),
        },
      });
    }

    return Response.json({
      ...updated,
      vaxRequirements: parseVaxRequirements(updated.vaxRequirements),
    });
  } catch (error) {
    return jsonError(error);
  }
}
