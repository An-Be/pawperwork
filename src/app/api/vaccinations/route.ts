import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseBody } from "@/lib/route-input";
import { vaccinationCreateSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

/** Business-side manual entry of a vaccination record. */
export async function POST(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    const { petId, ...data } = parseBody(
      vaccinationCreateSchema,
      await request.json(),
    );

    // Confirm the pet belongs to this business before writing to it.
    const pet = await prisma.pet.findFirst({
      where: { id: petId, client: { businessId: business.id } },
      select: { id: true, clientId: true },
    });
    if (!pet) {
      return Response.json({ error: "Pet not found" }, { status: 404 });
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        petId: pet.id,
        ...data,
        // Entered by the business itself, so it counts as verified on create.
        verified: true,
      },
    });

    await recordAudit({
      businessId: business.id,
      action: "vaccination.create",
      targetType: "Vaccination",
      targetId: vaccination.id,
      clientId: pet.clientId,
      metadata: { type: vaccination.type },
    });

    return Response.json(vaccination, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
