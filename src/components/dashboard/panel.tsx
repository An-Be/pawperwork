import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

/** One numbered, bordered section of a dashboard or form screen (TabMath's panel pattern). */
export function Panel({
  n,
  title,
  aside,
  children,
  className,
}: {
  n: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section>
      <SectionLabel n={n} aside={aside}>
        {title}
      </SectionLabel>
      <div className={cn("border border-ink p-5", className)}>{children}</div>
    </section>
  );
}
