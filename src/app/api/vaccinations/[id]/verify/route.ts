import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import {
  parseBody,
  parseIdParam,
  readOptionalJson,
} from "@/lib/route-input";
import { vaccinationVerifySchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

/** Marks an owner-uploaded record as checked by the business (spec §3). */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/vaccinations/[id]/verify">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const vaccinationId = parseIdParam(id);

    // An absent body means "verify"; `verified: false` un-verifies, so a
    // mistaken click is recoverable.
    const { verified } = parseBody(
      vaccinationVerifySchema,
      await readOptionalJson(request),
    );

    const existing = await prisma.vaccination.findFirst({
      where: { id: vaccinationId, pet: { client: { businessId: business.id } } },
      select: { id: true, type: true, pet: { select: { clientId: true } } },
    });
    if (!existing) {
      return Response.json({ error: "Vaccination not found" }, { status: 404 });
    }

    const updated = await prisma.vaccination.update({
      where: { id: existing.id },
      data: { verified },
    });

    await recordAudit({
      businessId: business.id,
      action: "vaccination.verify",
      targetType: "Vaccination",
      targetId: existing.id,
      clientId: existing.pet.clientId,
      metadata: { verified, type: existing.type },
    });

    return Response.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
