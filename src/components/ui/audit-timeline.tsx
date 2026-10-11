import { History } from "lucide-react";
import { describeAuditEntry } from "@/lib/audit";
import { formatDate } from "@/lib/email";
import type { AuditLogEntry } from "@/lib/queries";

/** Server component — read-only, no state or interaction. */
export function AuditTimeline({
  entries,
  emptyLabel,
}: {
  entries: AuditLogEntry[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" aria-hidden />
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const { label, icon: Icon } = describeAuditEntry(entry);
        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(entry.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
