import { CircleCheckBig, FileSignature, Mail, Send, Settings, Syringe, Trash2, type LucideIcon } from "lucide-react";

/**
 * Every action recordAudit() (src/lib/server/audit.ts) can log. Add new
 * action strings here and to describeAuditEntry's switch together; the two
 * must stay in sync or a new action falls through to the generic label.
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

/** Human-readable label + icon for one logged entry, for the activity views. */
export function describeAuditEntry(entry: { action: string; metadata: unknown }): { label: string; icon: LucideIcon } {
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
      const fields = Array.isArray(meta.changedFields) ? (meta.changedFields as string[]).join(", ") : "profile";
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
