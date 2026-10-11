import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const f = createUploadthing();

/**
 * Vaccination record uploads happen on the PUBLIC intake form, so there is no
 * session to authenticate. Instead every upload must name a real business
 * slug — that keeps the endpoint from becoming open file hosting while still
 * letting a pet owner upload without an account.
 */
export const uploadRouter = {
  vaxRecord: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .input(z.object({ slug: z.string().min(1).max(64) }))
    .middleware(async ({ input, req }) => {
      // Public and unauthenticated, same as the intake form itself — cap by
      // IP so it can't be used to rack up storage/bandwidth for free. A real
      // submission uploads at most a handful of certificate photos.
      const { allowed } = await checkRateLimit(
        `uploadthing:ip:${clientIp(req)}`,
        20,
        10 * 60_000,
      );
      if (!allowed) {
        throw new UploadThingError("Too many uploads — please try again shortly.");
      }

      const business = await prisma.business.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (!business) {
        throw new UploadThingError("Unknown intake form");
      }
      return { businessId: business.id };
    })
    .onUploadComplete(async ({ file }) => {
      // Returned to the browser and held in form state until submit, which is
      // what persists it onto the Vaccination row.
      return { url: file.ufsUrl, name: file.name };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
