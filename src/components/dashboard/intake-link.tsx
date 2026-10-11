import { CopyField } from "@/components/ui/copy-field";
import { appUrl } from "@/lib/format";

/** The business's public intake link, ready to copy onto a counter card or text. */
export function IntakeLink({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label text-mute">Your intake link</span>
      <CopyField value={appUrl(`/intake/${slug}`)} />
    </div>
  );
}
