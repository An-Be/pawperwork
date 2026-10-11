import { describe, expect, it } from "vitest";
import { buildIntakePayload, emptyPet, missingRequired, stepError, stepsFor, type IntakeDraft } from "./intake-draft";
import { intakeSubmissionSchema } from "./validation";

const requirements = [
  { name: "Rabies", required: true },
  { name: "Bordetella", required: false },
];
const waivers = [{ id: "cl0000000000000000000000a", title: "Service Agreement", bodyMarkdown: "Terms", version: 2 }];

function draft(): IntakeDraft {
  return {
    owner: { firstName: "Jamie", lastName: "Rivera", email: "jamie@example.com", phone: "" },
    contacts: { vetName: "", vetPhone: "", emergencyName: "", emergencyPhone: "" },
    pets: [{ ...emptyPet(requirements, "k1"), name: "Biscuit" }],
    signatures: { [waivers[0].id]: "Jamie Rivera" },
    agreed: { [waivers[0].id]: true },
  };
}

describe("stepsFor", () => {
  it("skips the waiver step when there are no waivers", () => {
    expect(stepsFor(0)).not.toContain("Waivers");
    expect(stepsFor(1)).toContain("Waivers");
  });
});

describe("stepError", () => {
  it("passes a complete draft", () => {
    for (const step of stepsFor(1)) expect(stepError(step, draft(), waivers), step).toBeNull();
  });

  it("needs a name and a valid email", () => {
    const d = draft();
    d.owner.lastName = " ";
    expect(stepError("Your details", d, waivers)).toMatch(/first and last name/);
    d.owner.lastName = "Rivera";
    d.owner.email = "jamie@";
    expect(stepError("Your details", d, waivers)).toMatch(/valid email/);
  });

  it("needs every pet named", () => {
    const d = draft();
    d.pets.push(emptyPet(requirements, "k2"));
    expect(stepError("Your pets", d, waivers)).toMatch(/name/);
  });

  it("needs the box ticked and a typed signature for every waiver", () => {
    const d = draft();
    d.agreed = {};
    expect(stepError("Waivers", d, waivers)).toMatch(/tick the box/);
    d.agreed = { [waivers[0].id]: true };
    d.signatures = { [waivers[0].id]: "JR" };
    expect(stepError("Waivers", d, waivers)).toMatch(/type your full name/);
  });
});

describe("missingRequired", () => {
  it("lists required types with nothing provided", () => {
    const pet = emptyPet(requirements, "k1");
    expect(missingRequired(pet, requirements)).toEqual(["Rabies"]);
    pet.vaccinations.Rabies = { administeredAt: "", expiresAt: "2027-01-01" };
    expect(missingRequired(pet, requirements)).toEqual([]);
  });
});

describe("buildIntakePayload", () => {
  it("trims, drops empty records, and passes the server schema", () => {
    const d = draft();
    d.owner.firstName = "  Jamie ";
    d.pets[0].vaccinations.Rabies = {
      administeredAt: "2026-01-01",
      expiresAt: "2027-01-01",
      documentUrl: "https://abc123.ufs.sh/f/key",
    };
    const payload = buildIntakePayload(d, waivers);
    expect(payload.owner.firstName).toBe("Jamie");
    expect(payload.pets[0].vaccinations.map((v) => v.type)).toEqual(["Rabies"]);
    expect(payload.signatures).toEqual([{ waiverId: waivers[0].id, signatureText: "Jamie Rivera" }]);

    const parsed = intakeSubmissionSchema.safeParse(payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("is rejected by the server schema when a record link isn't our upload storage", () => {
    const d = draft();
    d.pets[0].vaccinations.Rabies = { administeredAt: "", expiresAt: "", documentUrl: "https://evil.example/x.pdf" };
    const parsed = intakeSubmissionSchema.safeParse(buildIntakePayload(d, waivers));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/upload didn't finish/);
  });
});
