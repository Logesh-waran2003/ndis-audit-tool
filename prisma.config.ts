import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts && bun run prisma/rules-seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
