import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { waiverDocumentHash } from "@/lib/hash";
import { intakeSubmissionSchema } from "@/lib/validation";
import { parseBody, parseSlugParam } from "@/lib/route-input";
import { jsonError } from "@/lib/api-errors";
import { intakeConfirmationEmail, sendEmail } from "@/lib/email";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Public, unauthenticated endpoint (spec §8). Creates the client, pets,
 * vaccinations and waiver signatures atomically — a half-saved intake would
 * leave the business chasing paperwork that the owner believes they submitted.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/intake/[slug]/submit">,
) {
  try {
    const { slug } = await ctx.params;
    return await submitIntake(request, slug);
  } catch (error) {
    return jsonError(error);
  }
}

async function submitIntake(
  request: NextRequest,
  slug: string,
): Promise<Response> {
  // By IP first, before any DB lookup — caps probing across many slugs, not
  // just repeated hits on one. A real family resubmitting after a mistake
  // stays well under this; a script trying slugs does not.
  await enforceRateLimit(`intake-submit:ip:${clientIp(request)}`, 5, 10 * 60_000);

  const parsedSlug = parseSlugParam(slug);
  const business = await prisma.business.findUnique({
    where: { slug: parsedSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!business) {
    return Response.json({ error: "Intake form not found" }, { status: 404 });
  }

  // By slug too, so one business's form can't be flooded from many IPs —
  // generous enough for a genuinely busy intake day.
  await enforceRateLimit(`intake-submit:slug:${parsedSlug}`, 30, 10 * 60_000);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = parseBody(intakeSubmissionSchema, body);

  // Signatures must reference waivers belonging to THIS business, and are
  // hashed against the body text as it exists right now.
  const waiverIds = [...new Set(data.signatures.map((s) => s.waiverId))];
  const waivers = waiverIds.length
    ? await prisma.waiver.findMany({
        where: { id: { in: waiverIds }, businessId: business.id },
      })
    : [];
  if (waivers.length !== waiverIds.length) {
    return Response.json(
      { error: "One or more waivers do not belong to this business" },
      { status: 422 },
    );
  }
  const waiverById = new Map(waivers.map((waiver) => [waiver.id, waiver]));

  // Audit trail for the e-signature (spec §3).
  const ipAddress = clientIp(request);
  const userAgent = request.headers.get("user-agent");

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        businessId: business.id,
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
        email: data.owner.email,
        phone: data.owner.phone,
      },
    });

    for (const pet of data.pets) {
      await tx.pet.create({
        data: {
          clientId: client.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birthDate: pet.birthDate,
          weight: pet.weight,
          color: pet.color,
          behaviorNotes: pet.behaviorNotes,
          medicalNotes: pet.medicalNotes,
          // Collected once per submission, stored per pet.
          vetName: data.vetName,
          vetPhone: data.vetPhone,
          emergencyName: data.emergencyName,
          emergencyPhone: data.emergencyPhone,
          vaccinations: {
            create: pet.vaccinations.map((vax) => ({
              type: vax.type,
              administeredAt: vax.administeredAt,
              expiresAt: vax.expiresAt,
              documentUrl: vax.documentUrl,
              // The business verifies uploads itself (spec §3).
              verified: false,
            })),
          },
        },
      });
    }

    for (const signature of data.signatures) {
      const waiver = waiverById.get(signature.waiverId)!;
      await tx.waiverSignature.create({
        data: {
          waiverId: waiver.id,
          clientId: client.id,
          // Pin the version signed; later edits bump Waiver.version and must
          // not retroactively alter this record.
          waiverVersion: waiver.version,
          signatureText: signature.signatureText,
          documentHash: waiverDocumentHash(waiver.bodyMarkdown, waiver.version),
          ipAddress,
          userAgent,
        },
      });
    }

    return client;
  });

  // Confirmation email is best-effort: the intake is already committed.
  const confirmation = intakeConfirmationEmail({
    businessName: business.name,
    clientFirstName: result.firstName,
    petNames: data.pets.map((pet) => pet.name),
  });
  await sendEmail({ to: result.email, ...confirmation });

  return Response.json({ ok: true, clientId: result.id }, { status: 201 });
}
