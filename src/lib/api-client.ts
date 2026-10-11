/**
 * Minimal client-side helpers for the authenticated dashboard API. Pure
 * functional logic, so it lives in lib/ rather than beside a component.
 */

export type ApiResult = { ok: boolean; error: string };

/** POSTs with no body and normalises the error message. */
export async function postJson(url: string): Promise<ApiResult> {
  const response = await fetch(url, { method: "POST" });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, error: readError(body) };
}

export async function patchJson(
  url: string,
  payload: unknown,
): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, error: readError(body) };
}

/** The API always returns `{ error: string }` on failure, but never trust it. */
function readError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return "";
}
