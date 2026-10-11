import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseIdParam } from "@/lib/route-input";
import { intakeInvitationEmail, sendEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/**
 * Re-sends the intake link to an existing client (spec §3 "resend-intake-link",
 * §10 "intake invitation, business-triggered").
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/clients/[id]/invite">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const clientId = parseIdParam(id);

    // Authenticated, but still an email-send button a script or a stuck
    // double-click could hammer — cap it per business, not per click.
    await enforceRateLimit(`invite:business:${business.id}`, 20, 60 * 60_000);

    const client = await prisma.client.findFirst({
      where: { id: clientId, businessId: business.id },
      select: { email: true, firstName: true },
    });
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    const message = intakeInvitationEmail({
      businessName: business.name,
      slug: business.slug,
      clientFirstName: client.firstName,
    });
    const sent = await sendEmail({ to: client.email, ...message });
    if (!sent.ok) {
      return Response.json(
        { error: `Email not sent: ${sent.reason}`, skipped: sent.skipped },
        { status: sent.skipped ? 503 : 502 },
      );
    }

    await recordAudit({
      businessId: business.id,
      action: "client.invite_sent",
      targetType: "Client",
      targetId: clientId,
      clientId,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
