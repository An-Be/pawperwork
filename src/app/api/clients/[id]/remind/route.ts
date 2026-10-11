import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { manualReminderEmail, sendEmail } from "@/lib/server/email";
import { badRequest, json, notFound, rejectCrossSite, tooManyRequests } from "@/lib/server/http";
import { getClientDetail } from "@/lib/server/queries";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseId } from "@/lib/validation";

/**
 * Manual nudge from the client detail page.
 *
 * Deliberately NOT written to ReminderLog: that log exists to dedupe the four
 * automated reminder types, and recording a manual send as one of them would
 * suppress a scheduled reminder the business never actually sent.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/clients/[id]/remind">) {
  const blocked = rejectCrossSite(req, { hasBody: false });
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;

  const clientId = parseId((await ctx.params).id);
  if (!clientId) return notFound();

  // Authenticated, but still an email-send button: cap per business so a
  // stuck double-click or a scripted session can't spam a client's inbox.
  const limit = await checkRateLimit(`remind:business:${business.id}`, { limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const detail = await getClientDetail(business.id, clientId);
  if (!detail) return notFound();

  const outstanding = detail.pets.flatMap((pet) =>
    pet.summary.byType
      .filter((entry) => entry.required && entry.status !== "VALID")
      .map((entry) => ({ petName: pet.name, vaxType: entry.type, status: entry.status })),
  );
  if (outstanding.length === 0) return badRequest("Nothing outstanding for this client.");

  const message = manualReminderEmail({
    businessName: business.name,
    slug: business.slug,
    clientFirstName: detail.client.firstName,
    outstanding,
  });
  const sent = await sendEmail({ to: detail.client.email, ...message });
  if (!sent.ok) {
    return json({ error: `Email not sent: ${sent.reason}` }, sent.skipped ? 503 : 502);
  }

  await recordAudit({
    businessId: business.id,
    action: "client.remind_sent",
    targetType: "Client",
    targetId: clientId,
    clientId,
    metadata: { outstandingCount: outstanding.length },
  });

  return json({ ok: true, outstanding: outstanding.length });
}
