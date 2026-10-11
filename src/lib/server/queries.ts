import "server-only";
import { db } from "./db";
import { parseVaxRequirements, summarizePet, worstStatus, type PetVaxSummary, type VaxStatus } from "@/lib/vax";

/**
 * Every query here takes a `businessId` and filters by it. Vaccination status
 * is computed in application code (spec §9: derived, never stored) from the
 * records loaded alongside each pet.
 */

const petInclude = {
  pets: {
    include: { vaccinations: true },
    orderBy: { createdAt: "asc" },
  },
} as const;

export type PetWithStatus = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  summary: PetVaxSummary;
};

export type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  petCount: number;
  petNames: string[];
  status: VaxStatus;
  unsignedWaivers: number;
  pets: PetWithStatus[];
};

/** Clients plus derived pet/vax status, optionally filtered by a search term. */
export async function getClientRows(
  businessId: string,
  options: { search?: string; now?: Date } = {},
): Promise<ClientRow[]> {
  const now = options.now ?? new Date();
  const search = options.search?.trim();

  const [business, waiverCount, clients] = await Promise.all([
    db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { vaxRequirements: true },
    }),
    db.waiver.count({ where: { businessId } }),
    db.client.findMany({
      where: {
        businessId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { pets: { some: { name: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        ...petInclude,
        // A client may sign the same waiver once per version; count distinct
        // waivers they have signed at least once.
        waiverSignatures: { select: { waiverId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const requirements = parseVaxRequirements(business.vaxRequirements);

  return clients.map((client) => {
    const pets: PetWithStatus[] = client.pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      summary: summarizePet(pet.vaccinations, requirements, now),
    }));

    const signedWaiverIds = new Set(client.waiverSignatures.map((signature) => signature.waiverId));

    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
      petCount: pets.length,
      petNames: pets.map((pet) => pet.name),
      // A client with no pets has nothing to be out of date, so VALID.
      status: worstStatus(pets.map((pet) => pet.summary.overall)),
      unsignedWaivers: Math.max(0, waiverCount - signedWaiverIds.size),
      pets,
    };
  });
}

export type Overview = {
  totalClients: number;
  totalPets: number;
  expired: number;
  expiring: number;
  missing: number;
  unverified: number;
  clientsWithUnsignedWaivers: number;
  recentIntakes: { id: string; name: string; createdAt: Date; petNames: string[] }[];
};

/** Counts for the dashboard overview cards (spec §3). */
export async function getOverview(businessId: string, now = new Date()): Promise<Overview> {
  const rows = await getClientRows(businessId, { now });

  let expired = 0;
  let expiring = 0;
  let missing = 0;
  let unverified = 0;
  let totalPets = 0;

  for (const client of rows) {
    for (const pet of client.pets) {
      totalPets += 1;
      unverified += pet.summary.unverifiedCount;

      // A pet counts into EVERY bucket it has a problem in, so the buckets
      // overlap. Counting each pet only under its worst status would hide a
      // genuinely expired rabies record behind a separate missing one — the
      // exact thing this dashboard exists to surface.
      const required = pet.summary.byType.filter((entry) => entry.required);
      if (required.some((entry) => entry.status === "EXPIRED")) expired += 1;
      if (required.some((entry) => entry.status === "EXPIRING")) expiring += 1;
      if (required.some((entry) => entry.status === "MISSING")) missing += 1;
    }
  }

  return {
    totalClients: rows.length,
    totalPets,
    expired,
    expiring,
    missing,
    unverified,
    clientsWithUnsignedWaivers: rows.filter((row) => row.unsignedWaivers > 0).length,
    recentIntakes: rows.slice(0, 5).map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`,
      createdAt: row.createdAt,
      petNames: row.petNames,
    })),
  };
}

/** Full client detail, scoped to the business so ids are not cross-tenant. */
export async function getClientDetail(businessId: string, clientId: string, now = new Date()) {
  const client = await db.client.findFirst({
    where: { id: clientId, businessId },
    include: {
      ...petInclude,
      waiverSignatures: {
        include: { waiver: { select: { id: true, title: true, version: true } } },
        orderBy: { signedAt: "desc" },
      },
      business: {
        select: { id: true, name: true, slug: true, vaxRequirements: true },
      },
    },
  });
  if (!client) return null;

  const requirements = parseVaxRequirements(client.business.vaxRequirements);
  const waivers = await db.waiver.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });

  return {
    client,
    requirements,
    waivers,
    pets: client.pets.map((pet) => ({
      ...pet,
      summary: summarizePet(pet.vaccinations, requirements, now),
    })),
    status: worstStatus(client.pets.map((pet) => summarizePet(pet.vaccinations, requirements, now).overall)),
  };
}

export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
};

/** Recent activity for one client (reminders, invites, verify toggles). */
export async function getClientAuditLog(businessId: string, clientId: string, limit = 20): Promise<AuditLogEntry[]> {
  return db.auditLog.findMany({
    where: { businessId, clientId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
    },
  });
}

/** Recent business-level activity (waiver edits, settings changes) — no `clientId`. */
export async function getBusinessAuditLog(businessId: string, limit = 20): Promise<AuditLogEntry[]> {
  return db.auditLog.findMany({
    where: { businessId, clientId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
    },
  });
}
