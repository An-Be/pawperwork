import { getClientIp } from "@/lib/server/client-ip";
import { db } from "@/lib/server/db";
import { intakeConfirmationEmail, sendEmail } from "@/lib/server/email";
import { waiverDocumentHash } from "@/lib/server/hash";
import { json, notFound, parseJsonBody, rejectCrossSite, tooManyRequests } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { intakeSubmissionSchema, parseSlug } from "@/lib/validation";

// A family with several pets, notes and a few record links stays well under this.
const MAX_INTAKE_BYTES = 64 * 1024;

/**
 * Public, unauthenticated endpoint. Creates the client, pets, vaccinations and
 * waiver signatures atomically: a half-saved intake would leave the business
 * chasing paperwork that the owner believes they submitted.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/intake/[slug]/submit">) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;

  // By IP first, before any DB lookup: caps probing across many slugs, not
  // just repeated hits on one. A real family resubmitting after a mistake
  // stays well under this; a script trying slugs does not.
  const ip = getClientIp(req);
  const byIp = await checkRateLimit(`intake-submit:ip:${ip}`, { limit: 5, windowSeconds: 600 });
  if (!byIp.allowed) return tooManyRequests(byIp.retryAfterSeconds);

  const slug = parseSlug((await ctx.params).slug);
  if (!slug) return notFound();
  const business = await db.business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!business) return notFound();

  // By slug too, so one business's form can't be flooded from many IPs:
  // generous enough for a genuinely busy intake day.
  const bySlug = await checkRateLimit(`intake-submit:slug:${slug}`, { limit: 30, windowSeconds: 600 });
  if (!bySlug.allowed) return tooManyRequests(bySlug.retryAfterSeconds);

  const body = await parseJsonBody(req, intakeSubmissionSchema, MAX_INTAKE_BYTES);
  if (!body.ok) return body.response;
  const data = body.data;

  // Signatures must reference waivers belonging to THIS business, and are
  // hashed against the body text as it exists right now.
  const waiverIds = [...new Set(data.signatures.map((s) => s.waiverId))];
  const waivers = waiverIds.length
    ? await db.waiver.findMany({
        where: { id: { in: waiverIds }, businessId: business.id },
        select: { id: true, version: true, bodyMarkdown: true },
      })
    : [];
  if (waivers.length !== waiverIds.length) {
    return json({ error: "That waiver changed while you were filling in the form. Reload and sign again." }, 409);
  }
  const waiverById = new Map(waivers.map((waiver) => [waiver.id, waiver]));

  // Audit trail for the e-signature.
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const client = await db.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        businessId: business.id,
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
        email: data.owner.email,
        phone: data.owner.phone,
      },
      select: { id: true, firstName: true, email: true },
    });

    for (const pet of data.pets) {
      await tx.pet.create({
        data: {
          clientId: created.id,
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
              // The business verifies uploads itself.
              verified: false,
            })),
          },
        },
        select: { id: true },
      });
    }

    for (const signature of data.signatures) {
      const waiver = waiverById.get(signature.waiverId);
      if (!waiver) continue; // unreachable: checked above
      await tx.waiverSignature.create({
        data: {
          waiverId: waiver.id,
          clientId: created.id,
          // Pin the version signed; later edits bump Waiver.version and must
          // not retroactively alter this record.
          waiverVersion: waiver.version,
          signatureText: signature.signatureText,
          documentHash: waiverDocumentHash(waiver.bodyMarkdown, waiver.version),
          ipAddress: ip,
          userAgent,
        },
        select: { id: true },
      });
    }

    return created;
  });

  // Confirmation email is best-effort: the intake is already committed.
  const confirmation = intakeConfirmationEmail({
    businessName: business.name,
    clientFirstName: client.firstName,
    petNames: data.pets.map((pet) => pet.name),
  });
  await sendEmail({ to: client.email, ...confirmation });

  return json({ ok: true }, 201);
}
