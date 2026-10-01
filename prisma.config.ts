import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl = env("DATABASE_URL");

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
