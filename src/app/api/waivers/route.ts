import { recordAudit } from "@/lib/server/audit";
import { requireBusinessApi } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { waiverCreateSchema } from "@/lib/validation";

const MAX_WAIVER_BYTES = 64 * 1024;

export async function GET() {
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const waivers = await db.waiver.findMany({
    where: { businessId: auth.business.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, bodyMarkdown: true, version: true, _count: { select: { signatures: true } } },
  });
  return json({ waivers });
}

export async function POST(req: Request) {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const { business } = auth;
  const body = await parseJsonBody(req, waiverCreateSchema, MAX_WAIVER_BYTES);
  if (!body.ok) return body.response;

  const waiver = await db.waiver.create({
    data: { businessId: business.id, ...body.data },
    select: { id: true, title: true, bodyMarkdown: true, version: true },
  });

  await recordAudit({
    businessId: business.id,
    action: "waiver.create",
    targetType: "Waiver",
    targetId: waiver.id,
    metadata: { title: waiver.title },
  });

  return json(waiver, 201);
}
