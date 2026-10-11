import { requireBusinessApi } from "@/lib/server/auth";
import { notFound } from "@/lib/server/http";
import { packetFilename, renderIntakePacket } from "@/lib/server/intake-packet";
import { getClientDetail } from "@/lib/server/queries";
import { parseId } from "@/lib/validation";

/** @react-pdf/renderer needs Node APIs. */
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/clients/[id]/packet">) {
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const clientId = parseId((await ctx.params).id);
  if (!clientId) return notFound();

  const detail = await getClientDetail(auth.business.id, clientId);
  if (!detail) return notFound();

  const buffer = await renderIntakePacket(auth.business.name, detail);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${packetFilename(detail)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
