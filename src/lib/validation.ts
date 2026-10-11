import { z } from "zod";

/** Trimmed, required text. */
const text = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

/** Accepts "YYYY-MM-DD" from a date input, or an ISO string. */
const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return undefined;
    }
    return parsed;
  });

export const vaxRequirementSchema = z.object({
  name: text(60),
  required: z.boolean(),
});

export const vaccinationInputSchema = z.object({
  type: text(60),
  administeredAt: optionalDate,
  expiresAt: optionalDate,
  documentUrl: z.url().max(2000).optional(),
});

export const petInputSchema = z.object({
  name: text(80),
  species: text(40),
  breed: optionalText(80),
  birthDate: optionalDate,
  // Kept as a string through validation so Prisma's Decimal gets an exact value.
  weight: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return undefined;
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num) || num <= 0 || num > 9999) {
        ctx.addIssue({ code: "custom", message: "Invalid weight" });
        return undefined;
      }
      return num;
    }),
  color: optionalText(60),
  behaviorNotes: optionalText(),
  medicalNotes: optionalText(),
  vaccinations: z.array(vaccinationInputSchema).max(20).default([]),
});

export const waiverSignatureInputSchema = z.object({
  waiverId: z.cuid(),
  /** Typed full name (spec §3: typed-signature e-sign, no drawn signatures). */
  signatureText: text(120),
});

/** Payload for POST /api/intake/[slug]/submit. */
export const intakeSubmissionSchema = z.object({
  owner: z.object({
    firstName: text(80),
    lastName: text(80),
    email: z.email().max(200),
    phone: optionalText(40),
  }),
  // One vet + emergency contact per submission, stored on each pet so the
  // data model stays per-pet for future multi-vet support.
  vetName: optionalText(120),
  vetPhone: optionalText(40),
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(40),
  pets: z.array(petInputSchema).min(1).max(10),
  signatures: z.array(waiverSignatureInputSchema).default([]),
});

export type IntakeSubmission = z.infer<typeof intakeSubmissionSchema>;
export type PetInput = z.infer<typeof petInputSchema>;

export const businessSettingsSchema = z.object({
  name: text(120).optional(),
  email: z.email().max(200).optional(),
  phone: optionalText(40),
  address: optionalText(300),
  logoUrl: z.union([z.url().max(2000), z.literal("")]).optional(),
  vaxRequirements: z.array(vaxRequirementSchema).max(30).optional(),
});

export const waiverCreateSchema = z.object({
  title: text(160),
  bodyMarkdown: z.string().trim().min(1).max(50_000),
});

export const waiverUpdateSchema = waiverCreateSchema.partial();

export const onboardingSchema = z.object({
  name: text(120),
  email: z.email().max(200),
  phone: optionalText(40),
  address: optionalText(300),
});

export const vaccinationCreateSchema = vaccinationInputSchema.extend({
  petId: z.cuid(),
});

/** Formats a ZodError into a flat field->message map for the API response. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

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

/** Body of PATCH /api/vaccinations/[id]/verify. Absent body means verify. */
export const vaccinationVerifySchema = z.object({
  verified: z.boolean().default(true),
});

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
