import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { intakeInvitationEmail, sendEmail } from "@/lib/server/email";
import { json, notFound, rejectCrossSite, tooManyRequests } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseId } from "@/lib/validation";

/** Re-sends the intake link to an existing client. */
export async function POST(req: Request, ctx: RouteContext<"/api/clients/[id]/invite">) {
  const blocked = rejectCrossSite(req, { hasBody: false });
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;

  const clientId = parseId((await ctx.params).id);
  if (!clientId) return notFound();

  // Authenticated, but still an email-send button a script or a stuck
  // double-click could hammer: cap it per business, not per click.
  const limit = await checkRateLimit(`invite:business:${business.id}`, { limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const client = await db.client.findFirst({
    where: { id: clientId, businessId: business.id },
    select: { email: true, firstName: true },
  });
  if (!client) return notFound();

  const message = intakeInvitationEmail({
    businessName: business.name,
    slug: business.slug,
    clientFirstName: client.firstName,
  });
  const sent = await sendEmail({ to: client.email, ...message });
  if (!sent.ok) {
    return json({ error: `Email not sent: ${sent.reason}` }, sent.skipped ? 503 : 502);
  }

  await recordAudit({
    businessId: business.id,
    action: "client.invite_sent",
    targetType: "Client",
    targetId: clientId,
    clientId,
  });

  return json({ ok: true });
}
