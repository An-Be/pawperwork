import { prisma } from "./db";
import { ApiRateLimitError } from "./api-errors";

/**
 * Fixed-window rate limiting backed by Postgres (`RateLimitHit`), since no
 * Redis/KV is provisioned for this app and the traffic this guards against
 * — scripted abuse of public forms, not high-QPS production load — doesn't
 * need anything faster. A window is `floor(now / windowMs) * windowMs`, so
 * `(key, windowStart)` is a natural upsert target: concurrent requests in the
 * same window race on one row's `count` increment rather than losing writes.
 */

const DEFAULT_WINDOW_MS = 60_000;

export type RateLimitResult = { allowed: boolean; remaining: number };

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await prisma.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  // Opportunistic cleanup instead of a dedicated cron entry: cheap, and
  // bounds the table's growth without adding a query to every request.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - windowMs * 10);
    void prisma.rateLimitHit
      .deleteMany({ where: { windowStart: { lt: cutoff } } })
      .catch((error) => console.error("[rate-limit] cleanup failed", error));
  }

  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/** Throws `ApiRateLimitError` (→ 429) instead of returning a result to check. */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs?: number,
): Promise<void> {
  const { allowed } = await checkRateLimit(key, limit, windowMs);
  if (!allowed) throw new ApiRateLimitError();
}

/**
 * Best-effort client IP from standard proxy headers. Vercel sets
 * `x-forwarded-for`; this is identification for abuse-limiting, not a
 * security boundary — a spoofed header only lets an attacker rate-limit
 * themselves differently, never bypass another check.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
