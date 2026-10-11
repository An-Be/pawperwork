import type { NextRequest } from "next/server";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseIdParam } from "@/lib/route-input";
import { getClientDetail } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/clients/[id]">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const clientId = parseIdParam(id);
    const detail = await getClientDetail(business.id, clientId);
    if (!detail) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }
    return Response.json(detail);
  } catch (error) {
    return jsonError(error);
  }
}
