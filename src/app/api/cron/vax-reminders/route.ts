import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ReminderType } from "@/generated/prisma/enums";
import {
  currentRecordForType,
  daysUntil,
  dueReminder,
  parseVaxRequirements,
} from "@/lib/vax";
import { sendEmail, vaxExpiredEmail, vaxExpiringEmail } from "@/lib/email";

/**
 * Daily reminder cron (spec §3, §9). Invoked by Vercel Cron — see vercel.json.
 *
 * For every business, walk required vaccine types, find the record that
 * currently governs each type, and work out whether today falls in a reminder
 * window (T-30, T-14, T-7, expired+7). Dedupe against ReminderLog so a rerun
 * on the same day sends nothing.
 */

/** Never resend the same reminder for the same record within this window. */
const DEDUPE_DAYS = 7;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const header = request.headers.get("authorization");
  const provided =
    header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dedupeSince = new Date(now.getTime() - DEDUPE_DAYS * 86_400_000);

  const businesses = await prisma.business.findMany({
    include: {
      clients: {
        include: { pets: { include: { vaccinations: true } } },
      },
    },
  });

  let considered = 0;
  let sent = 0;
  let skippedDuplicate = 0;
  let failed = 0;

  for (const business of businesses) {
    const requirements = parseVaxRequirements(business.vaxRequirements).filter(
      (requirement) => requirement.required,
    );
    if (requirements.length === 0) continue;

    for (const client of business.clients) {
      for (const pet of client.pets) {
        for (const requirement of requirements) {
          const record = currentRecordForType(pet.vaccinations, requirement.name);
          // No record or no expiry date means there is nothing to count down
          // from; those are chased with the manual reminder button instead.
          if (!record?.expiresAt) continue;

          const reminderType = dueReminder(record.expiresAt, now);
          if (!reminderType) continue;
          considered += 1;

          const alreadySent = await prisma.reminderLog.findFirst({
            where: {
              petId: pet.id,
              vaccinationId: record.id,
              reminderType,
              sentAt: { gte: dedupeSince },
            },
            select: { id: true },
          });
          if (alreadySent) {
            skippedDuplicate += 1;
            continue;
          }

          const message =
            reminderType === ReminderType.EXPIRED
              ? vaxExpiredEmail({
                  businessName: business.name,
                  slug: business.slug,
                  clientFirstName: client.firstName,
                  petName: pet.name,
                  vaxType: record.type,
                  expiresAt: record.expiresAt,
                })
              : vaxExpiringEmail({
                  businessName: business.name,
                  slug: business.slug,
                  clientFirstName: client.firstName,
                  petName: pet.name,
                  vaxType: record.type,
                  daysUntil: daysUntil(record.expiresAt, now),
                  expiresAt: record.expiresAt,
                });

          const result = await sendEmail({ to: client.email, ...message });
          if (!result.ok) {
            failed += 1;
            // Not logged: an unsent reminder must stay due for the next run.
            continue;
          }

          await prisma.reminderLog.create({
            data: {
              businessId: business.id,
              clientId: client.id,
              petId: pet.id,
              vaccinationId: record.id,
              reminderType,
            },
          });
          sent += 1;
        }
      }
    }
  }

  return Response.json({
    ok: true,
    ranAt: now.toISOString(),
    considered,
    sent,
    skippedDuplicate,
    failed,
  });
}
