import { describeAuditEntry } from "@/lib/audit-labels";
import { formatDate } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/server/queries";

/** Read-only list of logged business actions. */
export function AuditTimeline({ entries, emptyLabel }: { entries: AuditLogEntry[]; emptyLabel: string }) {
  if (entries.length === 0) return <p className="text-sm text-mute">{emptyLabel}</p>;

  return (
    <ul className="divide-y divide-rule">
      {entries.map((entry) => {
        const { label, icon: Icon } = describeAuditEntry(entry);
        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <Icon className="size-4 shrink-0 text-mute" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
            <span className="label shrink-0 text-mute">{formatDate(entry.createdAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
