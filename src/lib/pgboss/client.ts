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

  // pg-boss v12 requires explicit queue creation before send/work.
  // policy: "exclusive" is required for singletonKey dedup to actually work —
  // the default "standard" policy has no unique constraint covering
  // created/retry/active states, so send() never returns null and a new job
  // is created on every call regardless of singletonKey.
  await _boss.createQueue(SMS_AGENT_QUEUE, { policy: "exclusive" });
  console.log("[PgBoss] Started — queue ready:", SMS_AGENT_QUEUE);

  return _boss;
}
