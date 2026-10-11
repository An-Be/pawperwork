// The public intake form's in-browser state, its per-step checks and the
// payload it submits. Pure, so the step rules are unit-tested; the server
// validates the payload again with intakeSubmissionSchema (src/lib/validation.ts).

import type { VaxRequirement } from "./vax";

export type IntakeWaiver = {
  id: string;
  title: string;
  bodyMarkdown: string;
  version: number;
};

export type VaxDraft = {
  administeredAt: string;
  expiresAt: string;
  documentUrl?: string;
};

export type PetDraft = {
  /** Stable React key; never sent. */
  key: string;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  weight: string;
  color: string;
  behaviorNotes: string;
  medicalNotes: string;
  /** Keyed by requirement name. */
  vaccinations: Record<string, VaxDraft>;
};

export type OwnerDraft = { firstName: string; lastName: string; email: string; phone: string };
export type ContactsDraft = { vetName: string; vetPhone: string; emergencyName: string; emergencyPhone: string };

export type IntakeDraft = {
  owner: OwnerDraft;
  contacts: ContactsDraft;
  pets: PetDraft[];
  /** Typed signature per waiver id. */
  signatures: Record<string, string>;
  /** "I agree" ticked per waiver id. */
  agreed: Record<string, boolean>;
};

export const SPECIES = ["Dog", "Cat", "Other"] as const;

export const INTAKE_STEPS = [
  "Your details",
  "Your pets",
  "Vet & emergency",
  "Vaccination records",
  "Waivers",
  "Review",
] as const;

export type IntakeStep = (typeof INTAKE_STEPS)[number];

/** Waivers are skipped entirely when the business has none set up. */
export function stepsFor(waiverCount: number): IntakeStep[] {
  return waiverCount === 0 ? INTAKE_STEPS.filter((step) => step !== "Waivers") : [...INTAKE_STEPS];
}

export function emptyPet(requirements: readonly VaxRequirement[], key: string): PetDraft {
  return {
    key,
    name: "",
    species: "Dog",
    breed: "",
    birthDate: "",
    weight: "",
    color: "",
    behaviorNotes: "",
    medicalNotes: "",
    vaccinations: Object.fromEntries(
      requirements.map((requirement) => [requirement.name, { administeredAt: "", expiresAt: "" }]),
    ),
  };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Per-step gate, so an owner can't reach review with an unusable form. Null means the step is complete. */
export function stepError(step: IntakeStep, draft: IntakeDraft, waivers: readonly IntakeWaiver[]): string | null {
  switch (step) {
    case "Your details":
      if (!draft.owner.firstName.trim() || !draft.owner.lastName.trim())
        return "Please enter your first and last name.";
      if (!EMAIL.test(draft.owner.email.trim()))
        return "Please enter a valid email address. It's where your confirmation goes.";
      return null;
    case "Your pets":
      if (draft.pets.length === 0) return "Add at least one pet.";
      for (const pet of draft.pets) {
        if (!pet.name.trim()) return "Every pet needs a name.";
        if (!pet.species.trim()) return "Every pet needs a species.";
      }
      return null;
    case "Waivers":
      for (const waiver of waivers) {
        if (!draft.agreed[waiver.id]) return `Please tick the box to agree to "${waiver.title}".`;
        if ((draft.signatures[waiver.id] ?? "").trim().length < 3)
          return `Please type your full name to sign "${waiver.title}".`;
      }
      return null;
    default:
      return null;
  }
}

/** A record counts as provided once any date or a photo is on it. */
export function isProvided(draft: VaxDraft): boolean {
  return Boolean(draft.administeredAt || draft.expiresAt || draft.documentUrl);
}

/** Required types a pet has nothing for yet, for the review step. */
export function missingRequired(pet: PetDraft, requirements: readonly VaxRequirement[]): string[] {
  return requirements
    .filter((requirement) => requirement.required)
    .filter((requirement) => !isProvided(pet.vaccinations[requirement.name] ?? { administeredAt: "", expiresAt: "" }))
    .map((requirement) => requirement.name);
}

/** The JSON body for POST /api/intake/[slug]/submit. */
export function buildIntakePayload(draft: IntakeDraft, waivers: readonly IntakeWaiver[]) {
  return {
    owner: {
      firstName: draft.owner.firstName.trim(),
      lastName: draft.owner.lastName.trim(),
      email: draft.owner.email.trim(),
      phone: draft.owner.phone.trim(),
    },
    ...draft.contacts,
    pets: draft.pets.map((pet) => ({
      name: pet.name.trim(),
      species: pet.species.trim(),
      breed: pet.breed.trim(),
      birthDate: pet.birthDate,
      weight: pet.weight,
      color: pet.color.trim(),
      behaviorNotes: pet.behaviorNotes.trim(),
      medicalNotes: pet.medicalNotes.trim(),
      // Only send records the owner actually filled in or photographed.
      vaccinations: Object.entries(pet.vaccinations)
        .filter(([, vax]) => isProvided(vax))
        .map(([type, vax]) => ({
          type,
          administeredAt: vax.administeredAt,
          expiresAt: vax.expiresAt,
          documentUrl: vax.documentUrl,
        })),
    })),
    signatures: waivers.map((waiver) => ({
      waiverId: waiver.id,
      signatureText: (draft.signatures[waiver.id] ?? "").trim(),
    })),
  };
}
