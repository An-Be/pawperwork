import { isProvided, missingRequired, type IntakeDraft, type IntakeWaiver } from "@/lib/intake-draft";
import type { VaxRequirement } from "@/lib/vax";

export function ReviewStep({
  draft,
  waivers,
  requirements,
}: {
  draft: IntakeDraft;
  waivers: IntakeWaiver[];
  requirements: VaxRequirement[];
}) {
  const { owner, pets, signatures } = draft;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="font-display text-xl font-medium tracking-[-0.02em]">Almost there. Check it over and submit.</p>

      <div className="flex flex-col gap-1 border border-ink p-5">
        <p className="font-medium">
          {owner.firstName} {owner.lastName}
        </p>
        <p className="text-mute">{owner.email}</p>
        {owner.phone ? <p className="text-mute">{owner.phone}</p> : null}
      </div>

      {pets.map((pet) => {
        const provided = Object.entries(pet.vaccinations).filter(([, vax]) => isProvided(vax));
        const missing = missingRequired(pet, requirements);
        return (
          <div key={pet.key} className="flex flex-col gap-2 border border-ink p-5">
            <p className="font-medium">
              {pet.name}{" "}
              <span className="font-normal text-mute">
                · {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ""}
              </span>
            </p>
            {provided.length > 0 ? (
              <ul className="text-mute">
                {provided.map(([type, vax]) => (
                  <li key={type}>
                    {type}
                    {vax.expiresAt ? `, expires ${vax.expiresAt}` : ""}
                    {vax.documentUrl ? " · photo attached" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {missing.length > 0 ? (
              <p className="border-l-2 border-ink pl-3">
                Still missing: {missing.join(", ")}. You can submit now and send these later.
              </p>
            ) : null}
          </div>
        );
      })}

      {waivers.length > 0 ? (
        <div className="flex flex-col gap-1 border border-ink p-5">
          {waivers.map((waiver) => (
            <p key={waiver.id}>
              <span className="text-mute">
                {waiver.title} v{waiver.version} signed by{" "}
              </span>
              <span className="font-medium">{signatures[waiver.id]}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
