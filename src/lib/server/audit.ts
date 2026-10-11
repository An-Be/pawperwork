import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AuditAction } from "@/lib/audit-labels";
import { db } from "./db";

/**
 * Tamper-evident history of sensitive business-side actions — distinct from
 * `WaiverSignature`'s own audit trail, which covers what the *client* signed,
 * not what the business did afterward (verifying a record, editing a waiver,
 * sending a reminder). Useful for "did I actually save that" and, if a
 * client ever disputes a verified record, a defensible timeline.
 */
export type AuditEntry = {
  businessId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  /** Denormalized so client-scoped views don't need to join through the target. */
  clientId?: string;
  /** Small, non-sensitive context — never a copy of PII already stored elsewhere. */
  metadata?: Record<string, Prisma.InputJsonValue | undefined>;
};

/**
 * Best-effort: a logging failure must never fail the request it's logging.
 * Awaited (not fire-and-forget) so a slow write doesn't race the response,
 * but its own errors are caught and only logged, not re-thrown.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        businessId: entry.businessId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        clientId: entry.clientId,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", entry.action, error);
  }
}
