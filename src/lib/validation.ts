import { z } from "zod";
import { isUploadthingFileUrl } from "./upload-url";

// Every external input goes through one of these schemas. parseJsonBody
// (src/lib/server/http.ts) answers 400 with the FIRST issue's message, so each
// field carries a message a pet owner or business can act on.
//
// Zod object schemas strip unknown keys, which is what blocks mass assignment.
// Never switch one to .passthrough() or .loose().

/** Trimmed, required text. `label` names the field in the error message. */
const text = (label: string, max = 200) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, { error: `${label} is required.` })
    .max(max, { error: `${label} must be ${max} characters or fewer.` });

const optionalText = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` })
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const email = (label: string) =>
  z.email({ error: `${label} must be a valid email address.` }).max(200, { error: `${label} is too long.` });

/** Accepts "YYYY-MM-DD" from a date input, or an ISO string. */
const optionalDate = (label: string) =>
  z
    .union([z.string(), z.date()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return undefined;
      const parsed = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({ code: "custom", message: `${label} isn't a valid date.` });
        return undefined;
      }
      return parsed;
    });

export const vaxRequirementSchema = z.object({
  name: text("Vaccination name", 60),
  required: z.boolean(),
});

export const vaccinationInputSchema = z.object({
  type: text("Vaccination type", 60),
  administeredAt: optionalDate("Date given"),
  expiresAt: optionalDate("Expiry date"),
  // Only links to our own Uploadthing storage: the dashboard shows this as "View record".
  documentUrl: z
    .string()
    .max(2000)
    .refine(isUploadthingFileUrl, { error: "That record upload didn't finish. Try adding the photo again." })
    .optional(),
});

export const petInputSchema = z.object({
  name: text("Every pet's name", 80),
  species: text("Every pet's species", 40),
  breed: optionalText("Breed", 80),
  birthDate: optionalDate("Date of birth"),
  weight: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return undefined;
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num) || num <= 0 || num > 9999) {
        ctx.addIssue({ code: "custom", message: "Weight should be a number of pounds, like 42." });
        return undefined;
      }
      return num;
    }),
  color: optionalText("Color", 60),
  behaviorNotes: optionalText("Behavior notes"),
  medicalNotes: optionalText("Medical notes"),
  vaccinations: z
    .array(vaccinationInputSchema)
    .max(20, { error: "Too many vaccination records for one pet." })
    .default([]),
});

export const waiverSignatureInputSchema = z.object({
  waiverId: z.cuid({ error: "That waiver is no longer available. Reload the form." }),
  /** Typed full name: typed-signature e-sign, no drawn signatures. */
  signatureText: text("Your typed signature", 120),
});

/** Payload for POST /api/intake/[slug]/submit. */
export const intakeSubmissionSchema = z.object({
  owner: z.object({
    firstName: text("First name", 80),
    lastName: text("Last name", 80),
    email: email("Email"),
    phone: optionalText("Phone", 40),
  }),
  // One vet + emergency contact per submission, stored on each pet so the
  // data model stays per-pet for future multi-vet support.
  vetName: optionalText("Vet practice", 120),
  vetPhone: optionalText("Vet phone", 40),
  emergencyName: optionalText("Emergency contact", 120),
  emergencyPhone: optionalText("Emergency phone", 40),
  pets: z
    .array(petInputSchema)
    .min(1, { error: "Add at least one pet." })
    .max(10, { error: "One form can hold up to 10 pets." }),
  signatures: z.array(waiverSignatureInputSchema).max(20).default([]),
});

export type IntakeSubmission = z.infer<typeof intakeSubmissionSchema>;
export type PetInput = z.infer<typeof petInputSchema>;

export const businessSettingsSchema = z.object({
  name: text("Business name", 120).optional(),
  email: email("Contact email").optional(),
  phone: optionalText("Phone", 40),
  address: optionalText("Address", 300),
  logoUrl: z
    .union([z.url({ protocol: /^https$/, error: "Logo URL must start with https://." }).max(2000), z.literal("")])
    .optional(),
  vaxRequirements: z
    .array(vaxRequirementSchema)
    .max(30, { error: "Keep it to 30 vaccination types or fewer." })
    .optional(),
});

export const waiverCreateSchema = z.object({
  title: text("Waiver title", 160),
  bodyMarkdown: text("Waiver text", 50_000),
});

export const waiverUpdateSchema = waiverCreateSchema.partial();

export const onboardingSchema = z.object({
  name: text("Business name", 120),
  email: email("Contact email"),
  phone: optionalText("Phone", 40),
  address: optionalText("Address", 300),
});

export const vaccinationCreateSchema = vaccinationInputSchema.extend({
  petId: z.cuid({ error: "Pet not found." }),
});

// ---------------------------------------------------------------------------
// Route-level input. Path segments and query strings are external input just
// like a request body, so they are validated through Zod before use.
// ---------------------------------------------------------------------------

/** A cuid path segment, e.g. /api/clients/[id]. */
export const idParamSchema = z.cuid();

/** A business slug path segment on the public intake routes. */
export const slugParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Invalid intake link");

/** `?search=` on GET /api/clients. */
export const clientSearchSchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
});

/** Body of PATCH /api/vaccinations/[id]/verify. */
export const vaccinationVerifySchema = z.object({
  verified: z.boolean({ error: "Say whether the record is verified." }),
});

/** A cuid path segment, or null so the route can answer 404 (ids aren't probeable). */
export function parseId(value: string): string | null {
  const result = idParamSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** A business slug path segment, or null for a 404. */
export function parseSlug(value: string): string | null {
  const result = slugParamSchema.safeParse(value);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Email OTP (one-time passcode) auth. Validated before anything is sent to
// Clerk, so a typo'd address never becomes a network round trip.
// ---------------------------------------------------------------------------

export const otpEmailSchema = z.email().max(200);

/** Clerk email codes are 6 digits. */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your email");
