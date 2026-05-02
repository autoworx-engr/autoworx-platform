import type { PgBoss } from "pg-boss";
const { PgBoss: PgBossCtor } = eval("require")(
  "pg-boss",
) as typeof import("pg-boss");

const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL || "";

const globalForBoss = globalThis as unknown as { boss: PgBoss | null };

export function getBoss(): PgBoss {
  if (!globalForBoss.boss) {
    globalForBoss.boss = new PgBossCtor({
      connectionString,
      max: 3,
    });
  }
  return globalForBoss.boss;
}
