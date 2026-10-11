import { requireBusinessApi } from "@/lib/server/auth";
import { json, notFound } from "@/lib/server/http";
import { getClientDetail } from "@/lib/server/queries";
import { parseId } from "@/lib/validation";

export async function GET(_req: Request, ctx: RouteContext<"/api/clients/[id]">) {
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const clientId = parseId((await ctx.params).id);
  if (!clientId) return notFound();

  const detail = await getClientDetail(auth.business.id, clientId);
  if (!detail) return notFound();
  return json(detail);
}
