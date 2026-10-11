import {
  CircleCheckBig,
  FileSignature,
  Mail,
  Send,
  Settings,
  Syringe,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Tamper-evident history of sensitive business-side actions — distinct from
 * `WaiverSignature`'s own audit trail, which covers what the *client* signed,
 * not what the business did afterward (verifying a record, editing a waiver,
 * sending a reminder). Useful for "did I actually save that" and, if a
 * client ever disputes a verified record, a defensible timeline.
 */
export type AuditAction =
  | "vaccination.verify"
  | "vaccination.create"
  | "waiver.create"
  | "waiver.update"
  | "waiver.delete"
  | "business.settings_update"
  | "client.remind_sent"
  | "client.invite_sent";

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
    await prisma.auditLog.create({
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

/** Human-readable label + icon for one logged entry, for the activity views. */
export function describeAuditEntry(entry: {
  action: string;
  metadata: unknown;
}): { label: string; icon: LucideIcon } {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;

  switch (entry.action as AuditAction) {
    case "vaccination.verify":
      return {
        label: meta.verified
          ? `Verified ${meta.type ?? "a vaccination record"}`
          : `Un-verified ${meta.type ?? "a vaccination record"}`,
        icon: CircleCheckBig,
      };
    case "vaccination.create":
      return {
        label: `Added a ${meta.type ?? ""} record`,
        icon: Syringe,
      };
    case "waiver.create":
      return { label: `Created waiver "${meta.title ?? ""}"`, icon: FileSignature };
    case "waiver.update":
      return {
        label: `Edited waiver "${meta.title ?? ""}" (now v${meta.newVersion ?? "?"})`,
        icon: FileSignature,
      };
    case "waiver.delete":
      return { label: `Deleted waiver "${meta.title ?? ""}"`, icon: Trash2 };
    case "business.settings_update": {
      const fields = Array.isArray(meta.changedFields)
        ? (meta.changedFields as string[]).join(", ")
        : "profile";
      return { label: `Updated ${fields}`, icon: Settings };
    }
    case "client.remind_sent":
      return {
        label: `Sent a reminder (${meta.outstandingCount ?? "?"} outstanding)`,
        icon: Send,
      };
    case "client.invite_sent":
      return { label: "Resent the intake link", icon: Mail };
    default:
      return { label: entry.action, icon: Settings };
  }
}
