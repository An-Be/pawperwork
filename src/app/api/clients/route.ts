import type { NextRequest } from "next/server";
import { requireBusinessApi } from "@/lib/server/auth";
import { badRequest, json } from "@/lib/server/http";
import { getClientRows } from "@/lib/server/queries";
import { clientSearchSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = await requireBusinessApi();
  if (!auth.ok) return auth.response;
  const query = clientSearchSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) return badRequest("Invalid search.");

  const rows = await getClientRows(auth.business.id, { search: query.data.search });
  // Derived status travels with each row so the client never recomputes it.
  return json({ clients: rows });
}
