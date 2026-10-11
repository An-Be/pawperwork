/**
 * Label/value row used by the client detail page. Server component — it has no
 * state or browser APIs.
 */
export function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{value || "—"}</dd>
    </div>
  );
}
