import { db } from "@/lib/db";

export const SMS_AGENT_QUEUE = "sms_agent" as const;

export interface PgmqMessage<T = unknown> {
  msg_id: bigint;
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: T;
}

/**
 * Thin TypeScript wrapper around the pure-PL/pgSQL PGMQ functions
 * installed by the 20260512000001_pgmq_sms_agent migration.
 *
 * All methods are bound to the sms_agent queue.
 */
export const pgmq = {
  async sendWithDelay<T>(message: T, delaySeconds: number): Promise<bigint> {
    console.log(
      `[PGMQ] sendWithDelay → queue="${SMS_AGENT_QUEUE}" delay=${delaySeconds}s payload=${JSON.stringify(message)}`,
    );
    const rows = await db.$queryRaw<[{ send_with_delay: bigint }]>`
      SELECT pgmq.send_with_delay(
        ${SMS_AGENT_QUEUE}::text,
        ${JSON.stringify(message)}::jsonb,
        ${delaySeconds}::integer
      ) AS send_with_delay
    `;
    const msgId = rows[0].send_with_delay;
    console.log(
      `[PGMQ] sendWithDelay ✓ msg_id=${msgId} visible_at=${new Date(Date.now() + delaySeconds * 1000).toISOString()}`,
    );
    return msgId;
  },

  async read<T>(vtSeconds: number, qty = 1): Promise<PgmqMessage<T>[]> {
    const messages = await db.$queryRaw<PgmqMessage<T>[]>`
      SELECT msg_id, read_ct, enqueued_at, vt, message
      FROM pgmq.read(
        ${SMS_AGENT_QUEUE}::text,
        ${vtSeconds}::integer,
        ${qty}::integer
      )
    `;
    if (messages.length > 0) {
      console.log(
        `[PGMQ] read → ${messages.length} message(s) locked for ${vtSeconds}s: ` +
          messages
            .map((m) => `msg_id=${m.msg_id} read_ct=${m.read_ct}`)
            .join(", "),
      );
    }
    return messages;
  },

  async delete(msgId: bigint): Promise<boolean> {
    console.log(`[PGMQ] delete → msg_id=${msgId}`);
    const rows = await db.$queryRaw<[{ delete: boolean }]>`
      SELECT pgmq.delete(
        ${SMS_AGENT_QUEUE}::text,
        ${msgId}::bigint
      ) AS delete
    `;
    const deleted = rows[0]?.delete ?? false;
    console.log(
      `[PGMQ] delete ${deleted ? "✓ removed" : "✗ not found"} msg_id=${msgId}`,
    );
    return deleted;
  },
};
