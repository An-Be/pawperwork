"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import {
  buildIntakePayload,
  emptyPet,
  stepError,
  stepsFor,
  type IntakeDraft,
  type IntakeWaiver,
  type PetDraft,
  type VaxDraft,
} from "@/lib/intake-draft";
import { toast } from "@/lib/toast";
import type { VaxRequirement } from "@/lib/vax";
import { ContactsStep } from "./contacts-step";
import { OwnerStep } from "./owner-step";
import { PetsStep } from "./pets-step";
import { ReviewStep } from "./review-step";
import { StepProgress } from "./step-progress";
import { VaccinationsStep } from "./vaccinations-step";
import { WaiversStep } from "./waivers-step";

/** The public, multi-step intake form a pet owner fills in on their phone. */
export function IntakeForm({
  business,
  requirements,
  waivers,
}: {
  business: { name: string; slug: string };
  requirements: VaxRequirement[];
  waivers: IntakeWaiver[];
}) {
  const router = useRouter();
  const steps = useMemo(() => stepsFor(waivers.length), [waivers.length]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(() => ({
    owner: { firstName: "", lastName: "", email: "", phone: "" },
    contacts: { vetName: "", vetPhone: "", emergencyName: "", emergencyPhone: "" },
    pets: [emptyPet(requirements, crypto.randomUUID())],
    signatures: {},
    agreed: {},
  }));

  const stepName = steps[step];
  const isLast = step === steps.length - 1;

  function update(patch: Partial<IntakeDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  function updatePet(key: string, patch: Partial<PetDraft>) {
    setDraft((previous) => ({
      ...previous,
      pets: previous.pets.map((pet) => (pet.key === key ? { ...pet, ...patch } : pet)),
    }));
  }

  function updateVax(key: string, type: string, patch: Partial<VaxDraft>) {
    setDraft((previous) => ({
      ...previous,
      pets: previous.pets.map((pet) =>
        pet.key === key
          ? { ...pet, vaccinations: { ...pet.vaccinations, [type]: { ...pet.vaccinations[type], ...patch } } }
          : pet,
      ),
    }));
  }

  /** Shows the current step's problem, if any. True when it's fine to move on. */
  function checkStep(): boolean {
    const error = stepError(stepName, draft, waivers);
    if (error) toast.error(error);
    return !error;
  }

  function go(to: number) {
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    if (!checkStep()) return;
    setSubmitting(true);
    const result = await api(`/api/intake/${business.slug}/submit`, {
      method: "POST",
      body: buildIntakePayload(draft, waivers),
    });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }
    router.push(`/intake/${business.slug}/success`);
  }

  return (
    <div className="flex flex-col gap-8">
      <StepProgress steps={steps} current={step} />

      {stepName === "Your details" ? <OwnerStep owner={draft.owner} onChange={(owner) => update({ owner })} /> : null}

      {stepName === "Your pets" ? (
        <PetsStep
          pets={draft.pets}
          onChange={updatePet}
          onAdd={() => update({ pets: [...draft.pets, emptyPet(requirements, crypto.randomUUID())] })}
          onRemove={(key) => update({ pets: draft.pets.filter((pet) => pet.key !== key) })}
        />
      ) : null}

      {stepName === "Vet & emergency" ? (
        <ContactsStep
          businessName={business.name}
          contacts={draft.contacts}
          onChange={(contacts) => update({ contacts })}
        />
      ) : null}

      {stepName === "Vaccination records" ? (
        <VaccinationsStep
          businessName={business.name}
          slug={business.slug}
          pets={draft.pets}
          requirements={requirements}
          onChange={updateVax}
        />
      ) : null}

      {stepName === "Waivers" ? (
        <WaiversStep
          waivers={waivers}
          signatures={draft.signatures}
          agreed={draft.agreed}
          onSign={(id, text) => update({ signatures: { ...draft.signatures, [id]: text } })}
          onAgree={(id, value) => update({ agreed: { ...draft.agreed, [id]: value } })}
        />
      ) : null}

      {stepName === "Review" ? <ReviewStep draft={draft} waivers={waivers} requirements={requirements} /> : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => go(step - 1)}>
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button type="button" size="lg" className="flex-1" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (checkStep()) go(Math.min(step + 1, steps.length - 1));
            }}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
