import { PgBoss } from "pg-boss";

export const SMS_AGENT_QUEUE = "sms-agent-debounce" as const;

let _boss: PgBoss | null = null;

/**
 * Returns the shared pg-boss singleton.
 * Safe to call from both the Next.js webhook and the worker process —
 * pg-boss handles concurrent access across multiple instances via PostgreSQL.
 */
export async function getBoss(): Promise<PgBoss> {
  if (_boss) return _boss;

  _boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    max: 5, // max DB connections in this pool
  });

  _boss.on("error", (err) => console.error("[PgBoss] Unexpected error:", err));

  await _boss.start();
  console.log("[PgBoss] Started and connected to PostgreSQL");

  return _boss;
}
