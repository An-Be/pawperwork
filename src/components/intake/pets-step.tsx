import { Button } from "@/components/ui/button";
import type { PetDraft } from "@/lib/intake-draft";
import { PetFields } from "./pet-fields";

export function PetsStep({
  pets,
  onChange,
  onAdd,
  onRemove,
}: {
  pets: PetDraft[];
  onChange: (key: string, patch: Partial<PetDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {pets.map((pet, index) => (
        <PetFields
          key={pet.key}
          pet={pet}
          index={index}
          onChange={(patch) => onChange(pet.key, patch)}
          onRemove={pets.length > 1 ? () => onRemove(pet.key) : undefined}
        />
      ))}
      <Button type="button" variant="outline" block onClick={onAdd}>
        Add another pet
      </Button>
    </div>
  );
}
