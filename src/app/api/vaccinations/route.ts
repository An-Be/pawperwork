import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json, notFound, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { vaccinationCreateSchema } from "@/lib/validation";

/** Business-side manual entry of a vaccination record. */
export async function POST(req: Request) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;
  const body = await parseJsonBody(req, vaccinationCreateSchema);
  if (!body.ok) return body.response;
  const { petId, ...data } = body.data;

  // Confirm the pet belongs to this business before writing to it.
  const pet = await db.pet.findFirst({
    where: { id: petId, client: { businessId: business.id } },
    select: { id: true, clientId: true },
  });
  if (!pet) return notFound();

  const vaccination = await db.vaccination.create({
    data: {
      petId: pet.id,
      ...data,
      // Entered by the business itself, so it counts as verified on create.
      verified: true,
    },
    select: { id: true, type: true, administeredAt: true, expiresAt: true, documentUrl: true, verified: true },
  });

  await recordAudit({
    businessId: business.id,
    action: "vaccination.create",
    targetType: "Vaccination",
    targetId: vaccination.id,
    clientId: pet.clientId,
    metadata: { type: vaccination.type },
  });

  return json(vaccination, 201);
}
