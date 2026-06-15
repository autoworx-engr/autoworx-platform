import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node -r tsconfig-paths/register prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
