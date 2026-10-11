import { STATUS_LABEL, type VaxStatus } from "@/lib/vax";
import { cn } from "@/lib/utils";

/**
 * Status tag. Monochrome, so weight carries severity and the label always
 * states the status: expired is solid ink, missing is a thick border,
 * expiring is a normal border, up to date is quiet.
 */
const STYLES: Record<VaxStatus, string> = {
  EXPIRED: "border-ink bg-ink text-paper",
  MISSING: "border-2 border-ink text-ink",
  EXPIRING: "border-ink text-ink",
  VALID: "border-rule text-mute",
};

export function VaxStatusTag({ status, className }: { status: VaxStatus; className?: string }) {
  return (
    <span className={cn("label inline-flex shrink-0 items-center border px-2 py-0.5", STYLES[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
