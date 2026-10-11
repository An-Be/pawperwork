import { ReminderType } from "@/lib/generated/prisma/enums";

/**
 * Vaccination status is DERIVED, never stored (spec §9). Everything here is a
 * pure function of a record's `expiresAt` versus a reference date, so the same
 * logic serves the dashboard, the client detail page and the reminder cron.
 */

export type VaxStatus = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

/** Days out at which a record stops being "valid" and starts being "expiring". */
export const EXPIRING_WINDOW_DAYS = 30;

/**
 * Worst-first severity. A pet's status is the worst status across its
 * business's *required* vaccine types. MISSING outranks EXPIRED: an expired
 * record is at least on file and dated, a missing one was never supplied.
 */
const SEVERITY: Record<VaxStatus, number> = {
  VALID: 0,
  EXPIRING: 1,
  EXPIRED: 2,
  MISSING: 3,
};

export type VaxRequirement = { name: string; required: boolean };

/** Default requirements for a new business (spec §3). */
export const DEFAULT_VAX_REQUIREMENTS: VaxRequirement[] = [
  { name: "Rabies", required: true },
  { name: "Distemper", required: true },
  { name: "Bordetella", required: false },
];

/**
 * `Business.vaxRequirements` is a Json column, so it is untrusted at the type
 * level — coerce it defensively rather than casting.
 */
export function parseVaxRequirements(value: unknown): VaxRequirement[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: VaxRequirement[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { name, required } = entry as Record<string, unknown>;
    if (typeof name !== "string") continue;
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: trimmed, required: required === true });
  }
  return out;
}

/** Midnight UTC for a date, so comparisons are whole days and DST-stable. */
function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const MS_PER_DAY = 86_400_000;

/**
 * Whole days from `now` until `expiresAt`. Negative means already expired.
 * 0 means it expires today, which still counts as EXPIRING, not EXPIRED.
 */
export function daysUntil(expiresAt: Date, now: Date = new Date()): number {
  return Math.round((startOfUtcDay(expiresAt) - startOfUtcDay(now)) / MS_PER_DAY);
}

type VaxRecordLike = {
  type: string;
  expiresAt: Date | null;
  verified?: boolean;
};

/**
 * A record with no expiry date reads as MISSING: a photo may be on file but
 * the dates are unknown, so the business still has paperwork to chase.
 */
export function statusForRecord(record: VaxRecordLike | null | undefined, now: Date = new Date()): VaxStatus {
  if (!record || !record.expiresAt) return "MISSING";
  const days = daysUntil(record.expiresAt, now);
  if (days < 0) return "EXPIRED";
  if (days <= EXPIRING_WINDOW_DAYS) return "EXPIRING";
  return "VALID";
}

/**
 * The record that currently governs a type is the one expiring furthest out —
 * a renewal supersedes the lapsed record it replaces.
 */
export function currentRecordForType<T extends VaxRecordLike>(records: readonly T[], type: string): T | undefined {
  const key = type.trim().toLowerCase();
  let best: T | undefined;
  for (const record of records) {
    if (record.type.trim().toLowerCase() !== key) continue;
    if (!best) {
      best = record;
      continue;
    }
    // Prefer a dated record over an undated one, then the latest expiry.
    if (!record.expiresAt) continue;
    if (!best.expiresAt || record.expiresAt > best.expiresAt) best = record;
  }
  return best;
}

export type VaxTypeStatus = {
  type: string;
  required: boolean;
  status: VaxStatus;
  expiresAt: Date | null;
  verified: boolean;
  daysUntilExpiry: number | null;
};

export type PetVaxSummary = {
  /** Worst status across required types; VALID when nothing is required. */
  overall: VaxStatus;
  /** Every required type, plus any optional type that has a record. */
  byType: VaxTypeStatus[];
  /** Required types with a record on file that nobody has verified yet. */
  unverifiedCount: number;
};

export function summarizePet<T extends VaxRecordLike>(
  records: readonly T[],
  requirements: readonly VaxRequirement[],
  now: Date = new Date(),
): PetVaxSummary {
  const byType: VaxTypeStatus[] = [];
  const covered = new Set<string>();

  for (const requirement of requirements) {
    const record = currentRecordForType(records, requirement.name);
    covered.add(requirement.name.trim().toLowerCase());
    byType.push({
      type: requirement.name,
      required: requirement.required,
      status: statusForRecord(record, now),
      expiresAt: record?.expiresAt ?? null,
      verified: record?.verified ?? false,
      daysUntilExpiry: record?.expiresAt ? daysUntil(record.expiresAt, now) : null,
    });
  }

  // Surface records for types the business no longer requires, so uploaded
  // paperwork never silently disappears from the client detail page.
  for (const record of records) {
    const key = record.type.trim().toLowerCase();
    if (covered.has(key)) continue;
    covered.add(key);
    const current = currentRecordForType(records, record.type);
    byType.push({
      type: record.type,
      required: false,
      status: statusForRecord(current, now),
      expiresAt: current?.expiresAt ?? null,
      verified: current?.verified ?? false,
      daysUntilExpiry: current?.expiresAt ? daysUntil(current.expiresAt, now) : null,
    });
  }

  const required = byType.filter((entry) => entry.required);
  const overall = required.reduce<VaxStatus>(
    (worst, entry) => (SEVERITY[entry.status] > SEVERITY[worst] ? entry.status : worst),
    "VALID",
  );

  return {
    overall,
    byType,
    unverifiedCount: required.filter((entry) => entry.status !== "MISSING" && !entry.verified).length,
  };
}

export function worstStatus(statuses: readonly VaxStatus[]): VaxStatus {
  return statuses.reduce<VaxStatus>((worst, status) => (SEVERITY[status] > SEVERITY[worst] ? status : worst), "VALID");
}

/**
 * Which reminder is due for a record today (spec §3: T-30, T-14, T-7 and
 * expired+7). Windows are disjoint so a single daily run fires at most one
 * reminder per record, and the 7-day dedupe in the cron keeps a slow window
 * from re-firing the same type.
 */
export function dueReminder(expiresAt: Date | null, now: Date = new Date()): ReminderType | null {
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt, now);
  if (days > EXPIRING_WINDOW_DAYS) return null;
  if (days > 14) return ReminderType.EXPIRING_30;
  if (days > 7) return ReminderType.EXPIRING_14;
  if (days >= 0) return ReminderType.EXPIRING_7;
  // Expired: chase a week after lapse, not every day forever.
  if (days <= -7) return ReminderType.EXPIRED;
  return null;
}

export const STATUS_LABEL: Record<VaxStatus, string> = {
  VALID: "Up to date",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
  MISSING: "Missing",
};
