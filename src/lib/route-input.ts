import type { z } from "zod";
import { validationError } from "./api-errors";
import { idParamSchema, slugParamSchema } from "./validation";

/**
 * Parsers for route-level external input. Each throws `ApiValidationError`,
 * which `jsonError` turns into a 422 — so handlers stay as guard clauses
 * instead of nested if/else.
 */

export function parseIdParam(value: string): string {
  const result = idParamSchema.safeParse(value);
  if (!result.success) throw validationError("Invalid id");
  return result.data;
}

export function parseSlugParam(value: string): string {
  const result = slugParamSchema.safeParse(value);
  if (!result.success) throw validationError("Invalid intake link");
  return result.data;
}

/** Validates a request body against a schema, or throws a 422. */
export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw validationError("Validation failed", result.error);
  return result.data;
}

/** Validates URLSearchParams against a schema, or throws a 422. */
export function parseSearchParams<T extends z.ZodType>(
  schema: T,
  params: URLSearchParams,
): z.output<T> {
  const result = schema.safeParse(Object.fromEntries(params));
  if (!result.success) throw validationError("Invalid query", result.error);
  return result.data;
}

/** Reads a JSON body, treating absent/invalid JSON as `{}` for optional bodies. */
export async function readOptionalJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
