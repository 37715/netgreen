import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma still needs a syntactically valid URL to generate the client during
// database-less preview builds. Production is guarded in scripts/build.mjs.
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://preview:preview@127.0.0.1:5432/preview";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
    directUrl: process.env.DIRECT_URL || databaseUrl,
  },
});
