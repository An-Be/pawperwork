import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseBody } from "@/lib/route-input";
import { waiverCreateSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    const waivers = await prisma.waiver.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { signatures: true } } },
    });
    return Response.json({ waivers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    const data = parseBody(waiverCreateSchema, await request.json());
    const waiver = await prisma.waiver.create({
      data: { businessId: business.id, ...data },
    });

    await recordAudit({
      businessId: business.id,
      action: "waiver.create",
      targetType: "Waiver",
      targetId: waiver.id,
      metadata: { title: waiver.title },
    });

    return Response.json(waiver, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
