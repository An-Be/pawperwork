import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, inputVariants } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES, type PetDraft } from "@/lib/intake-draft";

/** One pet's profile on the "Your pets" step. */
export function PetFields({
  pet,
  index,
  onChange,
  onRemove,
}: {
  pet: PetDraft;
  index: number;
  onChange: (patch: Partial<PetDraft>) => void;
  /** Absent when this is the only pet. */
  onRemove?: () => void;
}) {
  const id = (field: string) => `${field}-${pet.key}`;
  return (
    <div className="flex flex-col gap-4 border border-ink p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-medium tracking-[-0.02em]">{pet.name || `Pet ${index + 1}`}</p>
        {onRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor={id("name")} label="Name">
          <Input id={id("name")} value={pet.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field htmlFor={id("species")} label="Species">
          {/* Native select: one tap on mobile, no JS dropdown. */}
          <select
            id={id("species")}
            value={pet.species}
            onChange={(e) => onChange({ species: e.target.value })}
            className={inputVariants()}
          >
            {SPECIES.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={id("breed")} label="Breed">
          <Input id={id("breed")} value={pet.breed} onChange={(e) => onChange({ breed: e.target.value })} />
        </Field>
        <Field htmlFor={id("birthDate")} label="Date of birth">
          <Input
            id={id("birthDate")}
            type="date"
            value={pet.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
          />
        </Field>
        <Field htmlFor={id("weight")} label="Weight (lb)">
          <Input
            id={id("weight")}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={pet.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
          />
        </Field>
        <Field htmlFor={id("color")} label="Color">
          <Input id={id("color")} value={pet.color} onChange={(e) => onChange({ color: e.target.value })} />
        </Field>
      </div>

      <Field htmlFor={id("behavior")} label="Behavior notes">
        <Textarea
          id={id("behavior")}
          rows={2}
          placeholder="Nervous around clippers, doesn't like paws handled…"
          value={pet.behaviorNotes}
          onChange={(e) => onChange({ behaviorNotes: e.target.value })}
        />
      </Field>
      <Field htmlFor={id("medical")} label="Medical notes">
        <Textarea
          id={id("medical")}
          rows={2}
          placeholder="Allergies, medication, recent surgery…"
          value={pet.medicalNotes}
          onChange={(e) => onChange({ medicalNotes: e.target.value })}
        />
      </Field>
    </div>
  );
}
