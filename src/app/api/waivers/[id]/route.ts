import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseBody, parseIdParam } from "@/lib/route-input";
import { waiverUpdateSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

/**
 * Editing a waiver bumps its version (spec §9). Existing WaiverSignature rows
 * keep their own `waiverVersion` and `documentHash`, so what a client signed
 * is never rewritten underneath them.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/waivers/[id]">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const waiverId = parseIdParam(id);
    const patch = parseBody(waiverUpdateSchema, await request.json());

    const existing = await prisma.waiver.findFirst({
      where: { id: waiverId, businessId: business.id },
    });
    if (!existing) {
      return Response.json({ error: "Waiver not found" }, { status: 404 });
    }

    const next = {
      title: patch.title ?? existing.title,
      bodyMarkdown: patch.bodyMarkdown ?? existing.bodyMarkdown,
    };
    // A no-op save should not burn a version number.
    const changed =
      next.title !== existing.title ||
      next.bodyMarkdown !== existing.bodyMarkdown;

    const updated = await prisma.waiver.update({
      where: { id: existing.id },
      data: {
        ...next,
        ...(changed ? { version: { increment: 1 } } : {}),
      },
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

    return Response.json({ ...updated, versionBumped: changed });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/waivers/[id]">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const waiverId = parseIdParam(id);
    const existing = await prisma.waiver.findFirst({
      where: { id: waiverId, businessId: business.id },
      include: { _count: { select: { signatures: true } } },
    });
    if (!existing) {
      return Response.json({ error: "Waiver not found" }, { status: 404 });
    }
    // Deleting would cascade away signatures, destroying signed records.
    if (existing._count.signatures > 0) {
      return Response.json(
        {
          error:
            "This waiver has signatures on file and cannot be deleted. Edit it instead — that bumps the version and leaves existing signatures intact.",
        },
        { status: 409 },
      );
    }
    await prisma.waiver.delete({ where: { id: existing.id } });

    await recordAudit({
      businessId: business.id,
      action: "waiver.delete",
      targetType: "Waiver",
      targetId: existing.id,
      metadata: { title: existing.title },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
