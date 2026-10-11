import Markdown from "react-markdown";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { IntakeWaiver } from "@/lib/intake-draft";

export function WaiversStep({
  waivers,
  signatures,
  agreed,
  onSign,
  onAgree,
}: {
  waivers: IntakeWaiver[];
  signatures: Record<string, string>;
  agreed: Record<string, boolean>;
  onSign: (waiverId: string, text: string) => void;
  onAgree: (waiverId: string, value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {waivers.map((waiver) => (
        <div key={waiver.id} className="flex flex-col gap-4 border border-ink p-5">
          <p className="font-display text-lg font-medium tracking-[-0.02em]">{waiver.title}</p>
          <div className="max-h-64 overflow-y-auto border border-rule bg-wash p-3 text-sm [&_h2]:mt-3 [&_h2]:font-semibold [&_p]:mt-2 [&_strong]:font-semibold">
            <Markdown>{waiver.bodyMarkdown}</Markdown>
          </div>
          <div className="flex items-start gap-3">
            <input
              id={`agree-${waiver.id}`}
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-ink"
              checked={agreed[waiver.id] ?? false}
              onChange={(e) => onAgree(waiver.id, e.target.checked)}
            />
            <label htmlFor={`agree-${waiver.id}`} className="text-sm leading-snug">
              I have read and agree to {waiver.title} (version {waiver.version}).
            </label>
          </div>
          <Field
            htmlFor={`sign-${waiver.id}`}
            label="Type your full name to sign"
            hint="Typing your name counts as your signature. The date, your IP address and the exact wording above are recorded."
          >
            <Input
              id={`sign-${waiver.id}`}
              autoComplete="name"
              placeholder="Jane Doe"
              aria-describedby={`sign-${waiver.id}-desc`}
              value={signatures[waiver.id] ?? ""}
              onChange={(e) => onSign(waiver.id, e.target.value)}
            />
          </Field>
        </div>
      ))}
    </div>
  );
}
