import type { NextRequest } from "next/server";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseIdParam } from "@/lib/route-input";
import { getClientDetail } from "@/lib/queries";
import { packetFilename, renderIntakePacket } from "@/lib/intake-packet";

/** @react-pdf/renderer needs Node APIs, so this must not run on edge. */
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/clients/[id]/packet">,
) {
  try {
    const business = await requireBusinessApi(request);
    const { id } = await ctx.params;
    const clientId = parseIdParam(id);
    const detail = await getClientDetail(business.id, clientId);
    if (!detail) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    const buffer = await renderIntakePacket(business.name, detail);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${packetFilename(detail)}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
