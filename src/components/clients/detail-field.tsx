/** Label/value row on the client detail page. */
export function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <dt className="label w-28 shrink-0 pt-0.5 text-mute">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value || "—"}</dd>
    </div>
  );
}
