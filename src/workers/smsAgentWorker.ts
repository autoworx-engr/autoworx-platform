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

  console.log(
    `[Worker] Processing msg_id=${msg.msg_id} clientId=${clientId} companyId=${companyId} read_ct=${msg.read_ct} enqueued_at=${msg.enqueued_at.toISOString()}`,
  );

  // ── 1. How long since the client last sent a message? ──────────────
  const latest = await db.clientSMS.findFirst({
    where: { clientId, sentBy: "Client" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latest) {
    console.warn(
      `[Worker] ⚠ No SMS found in DB for clientId=${clientId} — discarding orphaned job msg_id=${msg.msg_id}`,
    );
    await pgmq.delete(msg.msg_id);
    await db.$executeRaw`DELETE FROM sms_agent_debounce WHERE client_id = ${clientId}`;
    return;
  }

  const msSinceLast = Date.now() - latest.createdAt.getTime();
  const secsSinceLast = Math.round(msSinceLast / 1000);

  console.log(
    `[Worker] clientId=${clientId} last SMS was ${secsSinceLast}s ago (debounce window=${DEBOUNCE_MS / 1000}s)`,
  );

  if (msSinceLast < DEBOUNCE_MS) {
    const requeueSecs = Math.ceil((DEBOUNCE_MS - msSinceLast) / 1000);
    console.log(
      `[Worker] ↺ Client ${clientId} still active — deleting msg_id=${msg.msg_id} and requeueing in ${requeueSecs}s`,
    );
    await pgmq.delete(msg.msg_id);
    const newMsgId = await pgmq.sendWithDelay(
      { clientId, companyId },
      requeueSecs,
    );
    console.log(
      `[Worker] ↺ Requeued clientId=${clientId} new msg_id=${newMsgId}`,
    );
    return;
  }

  // ── 2. 1 min of silence — claim the window atomically ──────────────
  console.log(
    `[Worker] Silence confirmed for clientId=${clientId} — claiming debounce row`,
  );
  const claimed = await db.$queryRaw<DebounceRow[]>`
    DELETE FROM sms_agent_debounce
    WHERE  client_id = ${clientId}
    RETURNING send_from, send_to, window_start
  `;

  if (claimed.length === 0) {
    console.warn(
      `[Worker] ⚠ clientId=${clientId} debounce row already claimed by another instance — skipping msg_id=${msg.msg_id}`,
    );
    await pgmq.delete(msg.msg_id);
    return;
  }

  const { send_from, send_to, window_start } = claimed[0];
  console.log(
    `[Worker] ✓ Claimed window for clientId=${clientId} window_start=${window_start.toISOString()} from=${send_from} to=${send_to}`,
  );

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

  console.log(
    `[Worker] Fetched ${rows.length} message(s) for clientId=${clientId} since window_start`,
  );
  rows.forEach((r, i) =>
    console.log(`[Worker]   [${i + 1}] "${r.message?.trim()}"`),
  );

  const combined = rows
    .map((r) => r.message?.trim())
    .filter(Boolean)
    .join("\n");

  if (!combined) {
    console.warn(
      `[Worker] ⚠ Combined message is empty for clientId=${clientId} — discarding msg_id=${msg.msg_id}`,
    );
    await pgmq.delete(msg.msg_id);
    return;
  }

  console.log(
    `[Worker] Sending combined message to AI agent for clientId=${clientId}:\n"""\n${combined}\n"""`,
  );

  // ── 4. Send the combined message to the AI agent ────────────────────
  try {
    await sendSMSToAgent({
      company_id: companyId,
      message: combined,
      send_from,
      send_to,
      client_id: clientId,
    });
    console.log(
      `[Worker] ✓ AI agent call succeeded for clientId=${clientId} (${rows.length} message(s) combined)`,
    );
  } catch (agentErr) {
    console.error(
      `[Worker] ✗ AI agent call failed for clientId=${clientId}:`,
      agentErr,
    );
    throw agentErr; // let the caller log it and leave the PGMQ message to retry via VT
  }

  await pgmq.delete(msg.msg_id);
  console.log(
    `[Worker] ✓ Job complete — msg_id=${msg.msg_id} clientId=${clientId}`,
  );
}

async function poll(): Promise<void> {
  const ts = new Date().toISOString();
  const messages = await pgmq.read<SmsAgentPayload>(VT_SECONDS, 5);

  if (messages.length === 0) {
    console.log(`[Worker] Poll ${ts} — queue empty`);
    return;
  }

  console.log(`[Worker] Poll ${ts} — ${messages.length} message(s) dequeued`);

  await Promise.allSettled(
    messages.map((msg) =>
      processMessage(msg).catch((err) =>
        console.error(
          `[Worker] ✗ Unhandled error on msg_id=${msg.msg_id}:`,
          err,
        ),
      ),
    ),
  );
}

async function run(): Promise<void> {
  console.log(
    `[SMS Agent Worker] Started — polling every ${POLL_INTERVAL_MS / 1000}s | debounce=${DEBOUNCE_MS / 1000}s | VT=${VT_SECONDS}s`,
  );
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
