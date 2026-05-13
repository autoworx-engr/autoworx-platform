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
  /**
   * Enqueue a message that becomes visible after `delaySeconds`.
   * Returns the new message id.
   */
  async sendWithDelay<T>(message: T, delaySeconds: number): Promise<bigint> {
    const rows = await db.$queryRaw<[{ send_with_delay: bigint }]>`
      SELECT pgmq.send_with_delay(
        ${SMS_AGENT_QUEUE}::text,
        ${JSON.stringify(message)}::jsonb,
        ${delaySeconds}::integer
      ) AS send_with_delay
    `;
    return rows[0].send_with_delay;
  },

  /**
   * Read up to `qty` due messages, locking each for `vtSeconds`
   * (invisible to other consumers during that window).
   */
  async read<T>(vtSeconds: number, qty = 1): Promise<PgmqMessage<T>[]> {
    return db.$queryRaw<PgmqMessage<T>[]>`
      SELECT msg_id, read_ct, enqueued_at, vt, message
      FROM pgmq.read(
        ${SMS_AGENT_QUEUE}::text,
        ${vtSeconds}::integer,
        ${qty}::integer
      )
    `;
  },

  /**
   * Permanently delete a message by id.
   * Returns true if a row was deleted.
   */
  async delete(msgId: bigint): Promise<boolean> {
    const rows = await db.$queryRaw<[{ delete: boolean }]>`
      SELECT pgmq.delete(
        ${SMS_AGENT_QUEUE}::text,
        ${msgId}::bigint
      ) AS delete
    `;
    return rows[0]?.delete ?? false;
  },
};
