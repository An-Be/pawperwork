import type { NextRequest } from "next/server";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseIdParam } from "@/lib/route-input";
import { getClientDetail } from "@/lib/queries";
import { manualReminderEmail, sendEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/**
 * Manual nudge from the client detail page (spec §3).
 *
 * Deliberately NOT written to ReminderLog: that log exists to dedupe the four
 * automated reminder types, and recording a manual send as one of them would
 * suppress a scheduled reminder the business never actually sent.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/clients/[id]/remind">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const clientId = parseIdParam(id);

    // Authenticated, but still an email-send button — cap per business so a
    // stuck double-click or a scripted session can't spam a client's inbox.
    await enforceRateLimit(`remind:business:${business.id}`, 20, 60 * 60_000);

    const detail = await getClientDetail(business.id, clientId);
    if (!detail) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    const outstanding = detail.pets.flatMap((pet) =>
      pet.summary.byType
        .filter((entry) => entry.required && entry.status !== "VALID")
        .map((entry) => ({
          petName: pet.name,
          vaxType: entry.type,
          status: entry.status,
        })),
    );

    if (outstanding.length === 0) {
      return Response.json(
        { error: "Nothing outstanding for this client" },
        { status: 400 },
      );
    }

    const message = manualReminderEmail({
      businessName: business.name,
      slug: business.slug,
      clientFirstName: detail.client.firstName,
      outstanding,
    });
    const sent = await sendEmail({ to: detail.client.email, ...message });

    if (!sent.ok) {
      return Response.json(
        { error: `Email not sent: ${sent.reason}`, skipped: sent.skipped },
        { status: sent.skipped ? 503 : 502 },
      );
    }

    await recordAudit({
      businessId: business.id,
      action: "client.remind_sent",
      targetType: "Client",
      targetId: clientId,
      clientId,
      metadata: { outstandingCount: outstanding.length },
    });

    return Response.json({ ok: true, outstanding: outstanding.length });
  } catch (error) {
    return jsonError(error);
  }
}
