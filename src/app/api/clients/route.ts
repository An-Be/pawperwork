import type { NextRequest } from "next/server";
import { requireBusinessApi } from "@/lib/auth";
import { jsonError } from "@/lib/api-errors";
import { parseSearchParams } from "@/lib/route-input";
import { clientSearchSchema } from "@/lib/validation";
import { getClientRows } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const business = await requireBusinessApi(request);
    const { search } = parseSearchParams(
      clientSearchSchema,
      request.nextUrl.searchParams,
    );
    const rows = await getClientRows(business.id, { search });
    // Derived status travels with each row so the client never recomputes it.
    return Response.json({ clients: rows });
  } catch (error) {
    return jsonError(error);
  }
}
