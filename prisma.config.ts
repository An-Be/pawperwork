import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, studio, the build-time drift check) uses the DIRECT
// (non-pooled) connection. The app itself connects at runtime with DATABASE_URL
// in src/lib/server/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Demo data for local development (npm run db:seed). Never run against production.
    // --conditions=react-server: the seed imports a server-only module (src/lib/server/hash.ts).
    seed: "tsx --conditions=react-server prisma/seed.mts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
