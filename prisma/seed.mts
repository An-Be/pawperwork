import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Demo data (spec §9): one business, two clients, three pets, mixed vax states
 * so every dashboard badge and every reminder window is reachable.
 *
 * Re-runnable: it deletes and recreates the demo business by slug and leaves
 * any other business alone.
 */

const DEMO_SLUG = "demo-grooming-co";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Midnight UTC, `days` from today — matches how the vax engine compares. */
function dayOffset(days: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
}

async function main() {
  // Attach the demo business to a real Clerk user with:
  //   SEED_CLERK_USER_ID=user_xxx npx prisma db seed
  const clerkUserId = process.env.SEED_CLERK_USER_ID ?? "seed_demo_user";

  await prisma.business.deleteMany({ where: { slug: DEMO_SLUG } });

  const business = await prisma.business.create({
    data: {
      clerkUserId,
      name: "Demo Grooming Co.",
      slug: DEMO_SLUG,
      email: "hello@demogrooming.example",
      phone: "(555) 010-0199",
      address: "14 Biscuit Lane, Portland, OR",
      vaxRequirements: [
        { name: "Rabies", required: true },
        { name: "Distemper", required: true },
        { name: "Bordetella", required: false },
      ],
      waivers: {
        create: [
          {
            title: "Service Agreement & Liability Waiver",
            bodyMarkdown:
              "## Service Agreement\n\nI confirm I am the owner of the pet(s) listed and that the information provided is accurate. I understand service may be refused if required vaccination records are missing or expired.\n\nI authorise Demo Grooming Co. to seek veterinary attention in an emergency, at my expense.",
          },
          {
            title: "Photo Release",
            bodyMarkdown:
              "## Photo Release\n\nI grant Demo Grooming Co. permission to photograph my pet and use those images in its portfolio and social media.",
          },
        ],
      },
    },
    include: { waivers: { orderBy: { createdAt: "asc" } } },
  });

  const [serviceWaiver] = business.waivers;

  // ── Client 1: everything in order, except one record expiring in 30 days
  // (that record puts the T-30 reminder exactly in range for a cron test).
  const jamie = await prisma.client.create({
    data: {
      businessId: business.id,
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie.rivera@example.com",
      phone: "(555) 010-0144",
      pets: {
        create: [
          {
            name: "Biscuit",
            species: "Dog",
            breed: "Cocker Spaniel",
            birthDate: dayOffset(-365 * 4),
            weight: 24.5,
            color: "Golden",
            behaviorNotes: "Wriggly around the clippers, fine with the dryer.",
            vetName: "Alberta Vet Clinic",
            vetPhone: "(555) 010-0777",
            emergencyName: "Sam Rivera",
            emergencyPhone: "(555) 010-0145",
            vaccinations: {
              create: [
                {
                  type: "Rabies",
                  administeredAt: dayOffset(-165),
                  expiresAt: dayOffset(200),
                  verified: true,
                },
                {
                  type: "Distemper",
                  administeredAt: dayOffset(-185),
                  expiresAt: dayOffset(180),
                  verified: true,
                },
                {
                  type: "Bordetella",
                  administeredAt: dayOffset(-275),
                  expiresAt: dayOffset(90),
                  verified: true,
                },
              ],
            },
          },
          {
            name: "Mochi",
            species: "Cat",
            breed: "British Shorthair",
            birthDate: dayOffset(-365 * 2),
            weight: 9.1,
            color: "Blue-grey",
            medicalNotes: "Mild reaction to one sedative — see vet notes.",
            vetName: "Alberta Vet Clinic",
            vetPhone: "(555) 010-0777",
            emergencyName: "Sam Rivera",
            emergencyPhone: "(555) 010-0145",
            vaccinations: {
              create: [
                {
                  // EXPIRING, and exactly in the T-30 reminder window.
                  type: "Rabies",
                  administeredAt: dayOffset(-335),
                  expiresAt: dayOffset(30),
                  verified: true,
                },
                {
                  type: "Distemper",
                  administeredAt: dayOffset(-30),
                  expiresAt: dayOffset(400),
                  verified: true,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Jamie signed the service waiver at v1 but not the photo release, so the
  // dashboard shows an outstanding waiver.
  await prisma.waiverSignature.create({
    data: {
      waiverId: serviceWaiver.id,
      clientId: jamie.id,
      waiverVersion: serviceWaiver.version,
      signatureText: "Jamie Rivera",
      documentHash: (await import("../src/lib/hash.ts")).waiverDocumentHash(
        serviceWaiver.bodyMarkdown,
        serviceWaiver.version,
      ),
      ipAddress: "203.0.113.42",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
      signedAt: dayOffset(-12),
    },
  });

  // ── Client 2: the problem case — one expired record, one missing entirely,
  // and an uploaded photo the business has not verified yet.
  await prisma.client.create({
    data: {
      businessId: business.id,
      firstName: "Priya",
      lastName: "Shah",
      email: "priya.shah@example.com",
      phone: "(555) 010-0188",
      pets: {
        create: [
          {
            name: "Tofu",
            species: "Dog",
            breed: "Shiba Inu",
            birthDate: dayOffset(-365 * 6),
            weight: 21,
            color: "Cream",
            behaviorNotes: "Will nip when nails are clipped — muzzle on hand.",
            vetName: "Riverside Animal Hospital",
            vetPhone: "(555) 010-0901",
            emergencyName: "Dev Shah",
            emergencyPhone: "(555) 010-0189",
            vaccinations: {
              create: [
                {
                  // EXPIRED, and past the expired+7 reminder threshold.
                  type: "Rabies",
                  administeredAt: dayOffset(-385),
                  expiresAt: dayOffset(-20),
                  verified: true,
                },
                // Distemper omitted entirely → MISSING.
                {
                  // Photo on file but undated and unverified → also MISSING.
                  type: "Bordetella",
                  documentUrl: "https://example.com/demo-bordetella-record.jpg",
                  verified: false,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const counts = {
    business: business.name,
    slug: business.slug,
    clerkUserId,
    clients: await prisma.client.count({ where: { businessId: business.id } }),
    pets: await prisma.pet.count({
      where: { client: { businessId: business.id } },
    }),
    waivers: business.waivers.length,
  };
  console.log("Seeded:", counts);
  console.log(`Intake form: /intake/${business.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
