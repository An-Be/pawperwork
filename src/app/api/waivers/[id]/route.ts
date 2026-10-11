import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json, notFound, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { parseId, waiverUpdateSchema } from "@/lib/validation";

const MAX_WAIVER_BYTES = 64 * 1024;

const waiverSelect = { id: true, title: true, bodyMarkdown: true, version: true } as const;

/**
 * Editing a waiver bumps its version. Existing WaiverSignature rows keep their
 * own `waiverVersion` and `documentHash`, so what a client signed is never
 * rewritten underneath them.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/waivers/[id]">) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;

  const waiverId = parseId((await ctx.params).id);
  if (!waiverId) return notFound();
  const body = await parseJsonBody(req, waiverUpdateSchema, MAX_WAIVER_BYTES);
  if (!body.ok) return body.response;
  const patch = body.data;

  const existing = await db.waiver.findFirst({
    where: { id: waiverId, businessId: business.id },
    select: waiverSelect,
  });
  if (!existing) return notFound();

  const next = {
    title: patch.title ?? existing.title,
    bodyMarkdown: patch.bodyMarkdown ?? existing.bodyMarkdown,
  };
  // A no-op save should not burn a version number.
  const changed = next.title !== existing.title || next.bodyMarkdown !== existing.bodyMarkdown;

  const updated = await db.waiver.update({
    where: { id: existing.id },
    data: { ...next, ...(changed ? { version: { increment: 1 } } : {}) },
    select: waiverSelect,
  });

  if (changed) {
    await recordAudit({
      businessId: business.id,
      action: "waiver.update",
      targetType: "Waiver",
      targetId: updated.id,
      metadata: { title: updated.title, newVersion: updated.version },
    });
  }

  return json({ ...updated, versionBumped: changed });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/waivers/[id]">) {
  const blocked = rejectCrossSite(req, { hasBody: false });
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;

  const waiverId = parseId((await ctx.params).id);
  if (!waiverId) return notFound();
  const existing = await db.waiver.findFirst({
    where: { id: waiverId, businessId: business.id },
    select: { id: true, title: true, _count: { select: { signatures: true } } },
  });
  if (!existing) return notFound();

  // Deleting would cascade away signatures, destroying signed records.
  if (existing._count.signatures > 0) {
    return json(
      {
        error:
          "This waiver has signatures on file and can't be deleted. Edit it instead: that bumps the version and leaves existing signatures intact.",
      },
      409,
    );
  }
  await db.waiver.delete({ where: { id: existing.id } });

  await recordAudit({
    businessId: business.id,
    action: "waiver.delete",
    targetType: "Waiver",
    targetId: existing.id,
    metadata: { title: existing.title },
  });

  return json({ ok: true });
}
