import { CircleAlert, CircleCheckBig, CircleHelp, ClockAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type VaxStatus } from "@/lib/vax";
import { cn } from "@/lib/utils";

/**
 * Colour is never the only signal — the label always states the status.
 * "stone" (warm gray) is used instead of "neutral"/"gray" for MISSING so it
 * doesn't read as a cold mismatch against the app's warm cream background.
 */
const STYLES: Record<VaxStatus, string> = {
  VALID:
    "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  EXPIRING:
    "border-amber-600/30 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  EXPIRED:
    "border-rose-600/30 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  MISSING:
    "border-stone-500/30 bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
};

const ICONS: Record<VaxStatus, typeof CircleCheckBig> = {
  VALID: CircleCheckBig,
  EXPIRING: ClockAlert,
  EXPIRED: CircleAlert,
  MISSING: CircleHelp,
};

export function VaxStatusBadge({
  status,
  className,
}: {
  status: VaxStatus;
  className?: string;
}) {
  const Icon = ICONS[status];
  return (
    <Badge variant="outline" className={cn(STYLES[status], className)}>
      <Icon className="size-3" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
