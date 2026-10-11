"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import {
  CircleCheckBig,
  ClipboardCheck,
  FileSignature,
  HeartPulse,
  PartyPopper,
  PawPrint,
  Syringe,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { speciesIcon } from "@/lib/pet-icons";
import type { VaxRequirement } from "@/lib/vax";
import { VaxUpload } from "./vax-upload";

type Waiver = {
  id: string;
  title: string;
  bodyMarkdown: string;
  version: number;
};

type VaxDraft = {
  administeredAt: string;
  expiresAt: string;
  documentUrl?: string;
};

type PetDraft = {
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

const SPECIES = ["Dog", "Cat", "Other"];

const STEPS = [
  "Your details",
  "Your pets",
  "Vet & emergency",
  "Vaccination records",
  "Waivers",
  "Review",
] as const;

const STEP_ICONS: Record<(typeof STEPS)[number], typeof User> = {
  "Your details": User,
  "Your pets": PawPrint,
  "Vet & emergency": HeartPulse,
  "Vaccination records": Syringe,
  Waivers: FileSignature,
  Review: ClipboardCheck,
};

function emptyPet(requirements: VaxRequirement[]): PetDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    species: "Dog",
    breed: "",
    birthDate: "",
    weight: "",
    color: "",
    behaviorNotes: "",
    medicalNotes: "",
    vaccinations: Object.fromEntries(
      requirements.map((requirement) => [
        requirement.name,
        { administeredAt: "", expiresAt: "" },
      ]),
    ),
  };
}

export function IntakeForm({
  business,
  requirements,
  waivers,
}: {
  business: { name: string; slug: string; logoUrl: string | null; phone: string | null };
  requirements: VaxRequirement[];
  waivers: Waiver[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [owner, setOwner] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [contacts, setContacts] = useState({
    vetName: "",
    vetPhone: "",
    emergencyName: "",
    emergencyPhone: "",
  });
  const [pets, setPets] = useState<PetDraft[]>([emptyPet(requirements)]);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  // Waivers are skipped entirely when the business has none configured.
  const steps = useMemo(
    () => (waivers.length === 0 ? STEPS.filter((s) => s !== "Waivers") : [...STEPS]),
    [waivers.length],
  );
  const stepName = steps[step];

  function updatePet(key: string, patch: Partial<PetDraft>) {
    setPets((previous) =>
      previous.map((pet) => (pet.key === key ? { ...pet, ...patch } : pet)),
    );
  }

  function updateVax(key: string, type: string, patch: Partial<VaxDraft>) {
    setPets((previous) =>
      previous.map((pet) =>
        pet.key === key
          ? {
              ...pet,
              vaccinations: {
                ...pet.vaccinations,
                [type]: { ...pet.vaccinations[type], ...patch },
              },
            }
          : pet,
      ),
    );
  }

  /** Per-step gate, so an owner cannot reach review with an unusable form. */
  function stepError(): string | null {
    switch (stepName) {
      case "Your details":
        if (!owner.firstName.trim() || !owner.lastName.trim())
          return "Please enter your first and last name.";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(owner.email.trim()))
          return "Please enter a valid email address — it's where your confirmation goes.";
        return null;
      case "Your pets":
        if (pets.length === 0) return "Add at least one pet.";
        for (const pet of pets) {
          if (!pet.name.trim()) return "Every pet needs a name.";
          if (!pet.species.trim()) return "Every pet needs a species.";
        }
        return null;
      case "Waivers": {
        for (const waiver of waivers) {
          if (!agreed[waiver.id])
            return `Please tick the box to agree to "${waiver.title}".`;
          const typed = (signatures[waiver.id] ?? "").trim();
          if (typed.length < 3)
            return `Please type your full name to sign "${waiver.title}".`;
        }
        return null;
      }
      default:
        return null;
    }
  }

  function next() {
    const error = stepError();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    const error = stepError();
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);

    const payload = {
      owner: {
        firstName: owner.firstName.trim(),
        lastName: owner.lastName.trim(),
        email: owner.email.trim(),
        phone: owner.phone.trim(),
      },
      ...contacts,
      pets: pets.map((pet) => ({
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
          .filter(
            ([, draft]) =>
              draft.administeredAt || draft.expiresAt || draft.documentUrl,
          )
          .map(([type, draft]) => ({
            type,
            administeredAt: draft.administeredAt,
            expiresAt: draft.expiresAt,
            documentUrl: draft.documentUrl,
          })),
      })),
      signatures: waivers.map((waiver) => ({
        waiverId: waiver.id,
        signatureText: (signatures[waiver.id] ?? "").trim(),
      })),
    };

    const response = await fetch(`/api/intake/${business.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const firstField = body?.fields
        ? Object.values(body.fields)[0]
        : undefined;
      toast.error(
        (firstField as string) ?? body?.error ?? "Something went wrong — please try again.",
      );
      return;
    }

    router.push(`/intake/${business.slug}/success`);
  }

  const isLast = step === steps.length - 1;

  const StepIcon = STEP_ICONS[stepName];

  return (
    <main className="bg-warm-glow min-h-full flex-1">
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <header className="mb-6 text-center">
          {business.logoUrl ? (
            // `unoptimized`: the logo URL is business-supplied and arbitrary,
            // so it cannot be enumerated in `images.remotePatterns`.
            // Decorative, so alt is empty and the name below carries it.
            <Image
              src={business.logoUrl}
              alt=""
              width={160}
              height={48}
              unoptimized
              className="mx-auto mb-3 h-12 w-auto object-contain"
            />
          ) : (
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <PawPrint className="size-6" aria-hidden />
            </span>
          )}
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New client intake · about 5 minutes
          </p>
        </header>

        <div className="mb-6 space-y-3">
          {/* Step dots: a quick-glance map of the whole form, friendlier than
              "Step X of Y" alone. The text label stays as the only thing a
              screen reader needs — the dots are decorative. */}
          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {steps.map((name, index) => {
              const Icon = STEP_ICONS[name];
              const isDone = index < step;
              const isCurrent = index === step;
              return (
                <span
                  key={name}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 transition-colors sm:size-8",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <CircleCheckBig className="size-3.5 sm:size-4" />
                  ) : (
                    <Icon className="size-3.5 sm:size-4" />
                  )}
                </span>
              );
            })}
          </div>
          <Progress value={((step + 1) / steps.length) * 100} />
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <StepIcon className="size-4 text-primary" aria-hidden />
            Step {step + 1} of {steps.length} · {stepName}
          </p>
        </div>

        <div className="space-y-6">
        {stepName === "Your details" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  value={owner.firstName}
                  onChange={(e) =>
                    setOwner({ ...owner, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  value={owner.lastName}
                  onChange={(e) =>
                    setOwner({ ...owner, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={owner.email}
                onChange={(e) => setOwner({ ...owner, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Mobile number</Label>
              <Input
                id="ownerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={owner.phone}
                onChange={(e) => setOwner({ ...owner, phone: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        {stepName === "Your pets" ? (
          <div className="space-y-4">
            {pets.map((pet, index) => {
              const SpeciesIcon = speciesIcon(pet.species);
              return (
              <Card key={pet.key}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SpeciesIcon className="size-4" aria-hidden />
                      </span>
                      {pet.name || `Pet ${index + 1}`}
                    </p>
                    {pets.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPets((previous) =>
                            previous.filter((p) => p.key !== pet.key),
                          )
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${pet.key}`}>Name</Label>
                      <Input
                        id={`name-${pet.key}`}
                        value={pet.name}
                        onChange={(e) =>
                          updatePet(pet.key, { name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`species-${pet.key}`}>Species</Label>
                      {/* Native select: one tap on mobile, no JS dropdown. */}
                      <select
                        id={`species-${pet.key}`}
                        value={pet.species}
                        onChange={(e) =>
                          updatePet(pet.key, { species: e.target.value })
                        }
                        className="border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                      >
                        {SPECIES.map((species) => (
                          <option key={species} value={species}>
                            {species}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`breed-${pet.key}`}>Breed</Label>
                      <Input
                        id={`breed-${pet.key}`}
                        value={pet.breed}
                        onChange={(e) =>
                          updatePet(pet.key, { breed: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`birthDate-${pet.key}`}>
                        Date of birth
                      </Label>
                      <Input
                        id={`birthDate-${pet.key}`}
                        type="date"
                        value={pet.birthDate}
                        onChange={(e) =>
                          updatePet(pet.key, { birthDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`weight-${pet.key}`}>Weight (lb)</Label>
                      <Input
                        id={`weight-${pet.key}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={pet.weight}
                        onChange={(e) =>
                          updatePet(pet.key, { weight: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`color-${pet.key}`}>Color</Label>
                      <Input
                        id={`color-${pet.key}`}
                        value={pet.color}
                        onChange={(e) =>
                          updatePet(pet.key, { color: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`behavior-${pet.key}`}>
                      Behavior notes
                    </Label>
                    <Textarea
                      id={`behavior-${pet.key}`}
                      rows={2}
                      placeholder="Nervous around clippers, dislikes having paws handled…"
                      value={pet.behaviorNotes}
                      onChange={(e) =>
                        updatePet(pet.key, { behaviorNotes: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`medical-${pet.key}`}>Medical notes</Label>
                    <Textarea
                      id={`medical-${pet.key}`}
                      rows={2}
                      placeholder="Allergies, medication, recent surgery…"
                      value={pet.medicalNotes}
                      onChange={(e) =>
                        updatePet(pet.key, { medicalNotes: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setPets((previous) => [...previous, emptyPet(requirements)])
              }
            >
              <PawPrint className="size-4" aria-hidden />
              Add another pet
            </Button>
          </div>
        ) : null}

        {stepName === "Vet & emergency" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Who should {business.name} call if something happens while your
              pet is in their care?
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vetName">Vet practice</Label>
                <Input
                  id="vetName"
                  value={contacts.vetName}
                  onChange={(e) =>
                    setContacts({ ...contacts, vetName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vetPhone">Vet phone</Label>
                <Input
                  id="vetPhone"
                  type="tel"
                  inputMode="tel"
                  value={contacts.vetPhone}
                  onChange={(e) =>
                    setContacts({ ...contacts, vetPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyName">
                  Emergency contact (not you)
                </Label>
                <Input
                  id="emergencyName"
                  value={contacts.emergencyName}
                  onChange={(e) =>
                    setContacts({ ...contacts, emergencyName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  inputMode="tel"
                  value={contacts.emergencyPhone}
                  onChange={(e) =>
                    setContacts({ ...contacts, emergencyPhone: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ) : null}

        {stepName === "Vaccination records" ? (
          <div className="space-y-4">
            {requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {business.name} has not listed any vaccination requirements.
              </p>
            ) : null}
            {pets.map((pet) => (
              <Card key={pet.key}>
                <CardContent className="space-y-5 pt-6">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Syringe className="size-4" aria-hidden />
                    </span>
                    {pet.name || "This pet"}
                  </p>
                  {requirements.map((requirement) => {
                    const draft = pet.vaccinations[requirement.name] ?? {
                      administeredAt: "",
                      expiresAt: "",
                    };
                    return (
                      <div
                        key={requirement.name}
                        className="space-y-3 border-t pt-4 first:border-0 first:pt-0"
                      >
                        <p className="text-sm font-medium">
                          {requirement.name}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {requirement.required ? "required" : "optional"}
                          </span>
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`given-${pet.key}-${requirement.name}`}
                              className="text-xs"
                            >
                              Date given
                            </Label>
                            <Input
                              id={`given-${pet.key}-${requirement.name}`}
                              type="date"
                              value={draft.administeredAt}
                              onChange={(e) =>
                                updateVax(pet.key, requirement.name, {
                                  administeredAt: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor={`expires-${pet.key}-${requirement.name}`}
                              className="text-xs"
                            >
                              Expires
                            </Label>
                            <Input
                              id={`expires-${pet.key}-${requirement.name}`}
                              type="date"
                              value={draft.expiresAt}
                              onChange={(e) =>
                                updateVax(pet.key, requirement.name, {
                                  expiresAt: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <VaxUpload
                          slug={business.slug}
                          documentUrl={draft.documentUrl}
                          onUploaded={(url) =>
                            updateVax(pet.key, requirement.name, {
                              documentUrl: url,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {stepName === "Waivers" ? (
          <div className="space-y-4">
            {waivers.map((waiver) => (
              <Card key={waiver.id}>
                <CardContent className="space-y-4 pt-6">
                  <p className="font-medium">{waiver.title}</p>
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm [&_h2]:mt-3 [&_h2]:font-semibold [&_p]:mt-2 [&_strong]:font-semibold">
                    <Markdown>{waiver.bodyMarkdown}</Markdown>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`agree-${waiver.id}`}
                      checked={agreed[waiver.id] ?? false}
                      onCheckedChange={(checked) =>
                        setAgreed((previous) => ({
                          ...previous,
                          [waiver.id]: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor={`agree-${waiver.id}`}
                      className="font-normal leading-snug"
                    >
                      I have read and agree to {waiver.title} (version{" "}
                      {waiver.version}).
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`sign-${waiver.id}`}>
                      Type your full name to sign
                    </Label>
                    <Input
                      id={`sign-${waiver.id}`}
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={signatures[waiver.id] ?? ""}
                      onChange={(e) =>
                        setSignatures((previous) => ({
                          ...previous,
                          [waiver.id]: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Typing your name counts as your signature. The date, your
                      IP address and the exact wording above are recorded.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {stepName === "Review" ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <PartyPopper className="size-5 text-primary" aria-hidden />
              <p className="font-heading font-bold">
                Almost there — review and submit
              </p>
            </div>
            <Card>
              <CardContent className="space-y-1 pt-6">
                <p className="font-medium">
                  {owner.firstName} {owner.lastName}
                </p>
                <p className="text-muted-foreground">{owner.email}</p>
                {owner.phone ? (
                  <p className="text-muted-foreground">{owner.phone}</p>
                ) : null}
              </CardContent>
            </Card>

            {pets.map((pet) => {
              const provided = Object.entries(pet.vaccinations).filter(
                ([, draft]) =>
                  draft.administeredAt || draft.expiresAt || draft.documentUrl,
              );
              const missing = requirements.filter(
                (requirement) =>
                  requirement.required &&
                  !provided.some(([type]) => type === requirement.name),
              );
              return (
                <Card key={pet.key}>
                  <CardContent className="space-y-2 pt-6">
                    <p className="font-medium">
                      {pet.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </span>
                    </p>
                    {provided.length > 0 ? (
                      <ul className="text-muted-foreground">
                        {provided.map(([type, draft]) => (
                          <li key={type}>
                            {type}
                            {draft.expiresAt ? ` — expires ${draft.expiresAt}` : ""}
                            {draft.documentUrl ? " · photo attached" : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {missing.length > 0 ? (
                      <p className="text-amber-700 dark:text-amber-300">
                        Still missing: {missing.map((m) => m.name).join(", ")}.
                        You can submit now and send these on later.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}

            {waivers.length > 0 ? (
              <Card>
                <CardContent className="space-y-1 pt-6">
                  {waivers.map((waiver) => (
                    <p key={waiver.id}>
                      <span className="text-muted-foreground">
                        {waiver.title} v{waiver.version} signed by{" "}
                      </span>
                      <span className="font-medium">
                        {signatures[waiver.id]}
                      </span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>

        <div className="mt-8 flex gap-3">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={back} className="flex-1">
              Back
            </Button>
          ) : null}
          {isLast ? (
            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Submitting…" : "Submit intake form"}
            </Button>
          ) : (
            <Button type="button" onClick={next} className="flex-1">
              Continue
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
