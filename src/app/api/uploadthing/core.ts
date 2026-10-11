import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getClientIp } from "@/lib/server/client-ip";
import { db } from "@/lib/server/db";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { slugParamSchema } from "@/lib/validation";

const f = createUploadthing();

/**
 * Vaccination record uploads happen on the PUBLIC intake form, so there is no
 * session to authenticate. Instead every upload must name a real business
 * slug: that keeps the endpoint from becoming open file hosting while still
 * letting a pet owner upload without an account.
 */
export const uploadRouter = {
  vaxRecord: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .input(z.object({ slug: slugParamSchema }))
    .middleware(async ({ input, req }) => {
      // Public and unauthenticated, same as the intake form itself: cap by IP
      // so it can't be used to rack up storage or bandwidth for free. A real
      // submission uploads at most a handful of certificate photos.
      const limit = await checkRateLimit(`upload:ip:${getClientIp(req)}`, { limit: 20, windowSeconds: 600 });
      if (!limit.allowed) throw new UploadThingError("Too many uploads. Try again in a few minutes.");

      const business = await db.business.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (!business) throw new UploadThingError("Unknown intake form");
      return { businessId: business.id };
    })
    .onUploadComplete(async ({ file }) => {
      // Returned to the browser and held in form state until submit, which is
      // what persists it onto the Vaccination row.
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
