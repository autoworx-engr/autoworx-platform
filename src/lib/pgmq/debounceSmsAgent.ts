import { db } from "@/lib/db";
import { pgmq } from "./client";

const DEBOUNCE_SECONDS = 90;

export interface DebounceParams {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
}

/**
 * Called for every incoming SMS from a client.
 *
 * On the FIRST message of a new debounce window:
 *   - Inserts a row into sms_agent_debounce (records windowStart)
 *   - Enqueues a PGMQ job visible in 60 s
 *
 * On subsequent messages in the SAME window:
 *   - The INSERT hits ON CONFLICT DO NOTHING → no new queue message
 *   - The worker will re-check the latest SMS timestamp and requeue
 *     if the client is still typing
 *
 * Fire-and-forget safe: errors are caught so they never surface to
 * the webhook response.
 */
export async function debounceSmsAgent({
  clientId,
  companyId,
  sendFrom,
  sendTo,
}: DebounceParams): Promise<void> {
  console.log(
    `[Debounce] Incoming SMS — clientId=${clientId} companyId=${companyId} from=${sendFrom} to=${sendTo}`,
  );

  const inserted = await db.$executeRaw`
    INSERT INTO sms_agent_debounce (client_id, company_id, send_from, send_to, window_start)
    VALUES (${clientId}, ${companyId}, ${sendFrom}, ${sendTo}, NOW())
    ON CONFLICT (client_id) DO NOTHING
  `;

  if (inserted === 1) {
    console.log(
      `[Debounce] New window — clientId=${clientId} enqueuing PGMQ job in ${DEBOUNCE_SECONDS}s`,
    );
    const msgId = await pgmq.sendWithDelay(
      { clientId, companyId },
      DEBOUNCE_SECONDS,
    );
    console.log(
      `[Debounce] ✓ Window open — clientId=${clientId} pgmq_msg_id=${msgId}`,
    );
  } else {
    console.log(
      `[Debounce] Window already open for clientId=${clientId} — skipping enqueue (worker will requeue if needed)`,
    );
  }
}
