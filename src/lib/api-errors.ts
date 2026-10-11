import type { ZodError } from "zod";
import { fieldErrors } from "./validation";

/**
 * Typed failures that route handlers can throw and have turned into a clean
 * response by `jsonError`, instead of each handler re-implementing status
 * codes and error shapes.
 */

export class ApiAuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/** Malformed external input: a bad path segment, query string or body. */
export class ApiValidationError extends Error {
  constructor(
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export function validationError(
  message: string,
  error?: ZodError,
): ApiValidationError {
  return new ApiValidationError(
    message,
    error ? fieldErrors(error) : undefined,
  );
}

/** Thrown by `checkRateLimit` callers — see src/lib/rate-limit.ts. */
export class ApiRateLimitError extends Error {
  constructor(message = "Too many requests. Please try again shortly.") {
    super(message);
    this.name = "ApiRateLimitError";
  }
}

/** Single place where a thrown error becomes an HTTP response. */
export function jsonError(error: unknown): Response {
  if (error instanceof ApiValidationError) {
    return Response.json(
      { error: error.message, ...(error.fields ? { fields: error.fields } : {}) },
      { status: 422 },
    );
  }
  if (error instanceof ApiAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ApiRateLimitError) {
    return Response.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  // Never surface internals — the cause goes to the logs instead.
  console.error("[api]", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
