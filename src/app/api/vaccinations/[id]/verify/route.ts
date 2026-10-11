import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json, notFound, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { parseId, vaccinationVerifySchema } from "@/lib/validation";

/**
 * Marks an owner-uploaded record as checked by the business. `verified: false`
 * un-verifies, so a mistaken click is recoverable.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/vaccinations/[id]/verify">) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;

  const vaccinationId = parseId((await ctx.params).id);
  if (!vaccinationId) return notFound();
  const body = await parseJsonBody(req, vaccinationVerifySchema);
  if (!body.ok) return body.response;
  const { verified } = body.data;

  const existing = await db.vaccination.findFirst({
    where: { id: vaccinationId, pet: { client: { businessId: business.id } } },
    select: { id: true, type: true, pet: { select: { clientId: true } } },
  });
  if (!existing) return notFound();

  const updated = await db.vaccination.update({
    where: { id: existing.id },
    data: { verified },
    select: { id: true, verified: true },
  });

  await recordAudit({
    businessId: business.id,
    action: "vaccination.verify",
    targetType: "Vaccination",
    targetId: existing.id,
    clientId: existing.pet.clientId,
    metadata: { verified, type: existing.type },
  });

  return json(updated);
}
