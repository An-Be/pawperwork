import { cn } from "@/lib/utils";

/** "Step 2 of 6 · Your pets", with a segmented bar as a quick map of the whole form. */
export function StepProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" aria-hidden>
        {steps.map((name, index) => (
          <span key={name} className={cn("h-1.5 flex-1", index <= current ? "bg-ink" : "bg-rule")} />
        ))}
      </div>
      <p className="label text-mute">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
    </div>
  );
}
