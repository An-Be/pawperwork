"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A disabled control with a "Coming soon" tooltip. Shows on hover and keyboard
 * focus, and on tap for phones (no hover there). aria-disabled rather than
 * disabled so it can still be focused and announce why it's off.
 */
export function ComingSoon({
  children,
  className,
  align = "center",
  side = "bottom",
}: {
  children: ReactNode;
  className?: string;
  /** "end" pins the tooltip to the right edge, for controls near the screen edge. */
  align?: "center" | "end";
  /** "top" when something sits right below the control. */
  side?: "top" | "bottom";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={id}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        // buttonVariants turns off pointer events when aria-disabled; keep them so hover and tap work.
        className={cn(className, "aria-disabled:pointer-events-auto cursor-not-allowed")}
      >
        {children}
      </button>
      <span
        role="tooltip"
        id={id}
        className={cn(
          "label pointer-events-none absolute z-10 whitespace-nowrap bg-ink px-2 py-1 text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
          open && "opacity-100",
        )}
      >
        Coming soon
      </span>
    </span>
  );
}
