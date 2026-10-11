import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PetDraft, VaxDraft } from "@/lib/intake-draft";
import type { VaxRequirement } from "@/lib/vax";
import { VaxUpload } from "./vax-upload";

const EMPTY: VaxDraft = { administeredAt: "", expiresAt: "" };

export function VaccinationsStep({
  businessName,
  slug,
  pets,
  requirements,
  onChange,
}: {
  businessName: string;
  slug: string;
  pets: PetDraft[];
  requirements: VaxRequirement[];
  onChange: (petKey: string, type: string, patch: Partial<VaxDraft>) => void;
}) {
  if (requirements.length === 0) {
    return <p className="text-sm text-mute">{businessName} hasn&apos;t listed any vaccination requirements.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {pets.map((pet) => (
        <div key={pet.key} className="flex flex-col gap-5 border border-ink p-5">
          <p className="font-display text-lg font-medium tracking-[-0.02em]">{pet.name || "This pet"}</p>
          {requirements.map((requirement) => {
            const draft = pet.vaccinations[requirement.name] ?? EMPTY;
            const id = (field: string) => `${field}-${pet.key}-${requirement.name}`;
            return (
              <div
                key={requirement.name}
                className="flex flex-col gap-3 border-t border-rule pt-4 first:border-0 first:pt-0"
              >
                <p className="text-sm font-medium">
                  {requirement.name}
                  <span className="label ml-2 text-mute">{requirement.required ? "required" : "optional"}</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field htmlFor={id("given")} label="Date given">
                    <Input
                      id={id("given")}
                      type="date"
                      value={draft.administeredAt}
                      onChange={(e) => onChange(pet.key, requirement.name, { administeredAt: e.target.value })}
                    />
                  </Field>
                  <Field htmlFor={id("expires")} label="Expires">
                    <Input
                      id={id("expires")}
                      type="date"
                      value={draft.expiresAt}
                      onChange={(e) => onChange(pet.key, requirement.name, { expiresAt: e.target.value })}
                    />
                  </Field>
                </div>
                <VaxUpload
                  slug={slug}
                  documentUrl={draft.documentUrl}
                  onUploaded={(url) => onChange(pet.key, requirement.name, { documentUrl: url })}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
