import { db } from "../lib/db";
import { pgmq, PgmqMessage } from "../lib/pgmq/client";
import { sendSMSToAgent } from "../service/ai-agent/api";

const DEBOUNCE_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;
// If the worker crashes mid-process the message reappears after this many seconds.
const VT_SECONDS = 90;

interface SmsAgentPayload {
  clientId: number;
  companyId: number;
}

interface DebounceRow {
  send_from: string;
  send_to: string;
  window_start: Date;
}

async function processMessage(
  msg: PgmqMessage<SmsAgentPayload>,
): Promise<void> {
  const { clientId, companyId } = msg.message;

  // ── 1. How long since the client last sent a message? ──────────────
  const latest = await db.clientSMS.findFirst({
    where: { clientId, sentBy: "Client" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latest) {
    // Orphaned job — no messages in DB, discard everything
    await pgmq.delete(msg.msg_id);
    await db.$executeRaw`DELETE FROM sms_agent_debounce WHERE client_id = ${clientId}`;
    return;
  }

  const msSinceLast = Date.now() - latest.createdAt.getTime();

  if (msSinceLast < DEBOUNCE_MS) {
    // Client is still typing — requeue for the remaining delay
    const requeueSecs = Math.ceil((DEBOUNCE_MS - msSinceLast) / 1000);
    await pgmq.delete(msg.msg_id);
    await pgmq.sendWithDelay({ clientId, companyId }, requeueSecs);
    console.log(
      `[Worker] Client ${clientId} still active — requeued for ${requeueSecs}s`,
    );
    return;
  }

  // ── 2. 1 min of silence — claim the window atomically ──────────────
  // DELETE … RETURNING is atomic: only ONE worker instance gets rows back.
  const claimed = await db.$queryRaw<DebounceRow[]>`
    DELETE FROM sms_agent_debounce
    WHERE  client_id = ${clientId}
    RETURNING send_from, send_to, window_start
  `;

  if (claimed.length === 0) {
    // Another worker instance already claimed this job
    await pgmq.delete(msg.msg_id);
    return;
  }

  const { send_from, send_to, window_start } = claimed[0];

  // ── 3. Fetch every client message since the window opened ───────────
  const rows = await db.clientSMS.findMany({
    where: {
      clientId,
      sentBy: "Client",
      createdAt: { gte: window_start },
    },
    orderBy: { createdAt: "asc" },
    select: { message: true },
  });

  const combined = rows
    .map((r) => r.message?.trim())
    .filter(Boolean)
    .join("\n");

  if (!combined) {
    await pgmq.delete(msg.msg_id);
    return;
  }

  // ── 4. Send the combined message to the AI agent ────────────────────
  await sendSMSToAgent({
    company_id: companyId,
    message: combined,
    send_from,
    send_to,
    client_id: clientId,
  });

  await pgmq.delete(msg.msg_id);

  console.log(
    `[Worker] Client ${clientId}: sent ${rows.length} combined message(s) to agent`,
  );
}

async function poll(): Promise<void> {
  const messages = await pgmq.read<SmsAgentPayload>(VT_SECONDS, 5);
  if (messages.length === 0) return;

  await Promise.allSettled(
    messages.map((msg) =>
      processMessage(msg).catch((err) =>
        console.error(`[Worker] Error on msg ${msg.msg_id}:`, err),
      ),
    ),
  );
}

async function run(): Promise<void> {
  console.log("[SMS Agent Worker] Started — polling every 5s");
  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error("[Worker] Poll error:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGTERM", () => {
  console.log("[Worker] Shutting down");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("[Worker] Shutting down");
  process.exit(0);
});

run();
