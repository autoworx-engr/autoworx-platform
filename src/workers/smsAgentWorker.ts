import { db } from "../lib/db";
import { getBoss, SMS_AGENT_QUEUE } from "../lib/pgboss/client";
import {
  DEBOUNCE_SECONDS,
  SmsAgentJobData,
} from "../lib/pgboss/debounceSmsAgent";
import { sendSMSToAgent } from "../service/ai-agent/api";
import type { Job } from "pg-boss";

const DEBOUNCE_MS = DEBOUNCE_SECONDS * 1000;

async function processJob(job: Job<SmsAgentJobData>): Promise<void> {
  const { clientId, companyId, sendFrom, sendTo, windowStart } = job.data;

  console.log(
    `[Worker] Job received — jobId=${job.id} clientId=${clientId} companyId=${companyId} windowStart=${windowStart}`,
  );

  // ── 1. How long since this client last sent an SMS? ─────────────────
  const latest = await db.clientSMS.findFirst({
    where: { clientId, sentBy: "Client" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latest) {
    console.warn(
      `[Worker] ⚠ No messages in DB for clientId=${clientId} — discarding job ${job.id}`,
    );
    return;
  }

  const msSinceLast = Date.now() - latest.createdAt.getTime();
  const secsSinceLast = Math.round(msSinceLast / 1000);

  console.log(
    `[Worker] clientId=${clientId} last SMS was ${secsSinceLast}s ago (debounce=${DEBOUNCE_SECONDS}s)`,
  );

  if (msSinceLast < DEBOUNCE_MS) {
    // ── 2a. Client still typing — requeue with remaining delay ──────────
    const requeueSecs = Math.ceil((DEBOUNCE_MS - msSinceLast) / 1000);

    const boss = await getBoss();
    const newJobId = await boss.send(SMS_AGENT_QUEUE, job.data, {
      singletonKey: `client-${clientId}`,
      startAfter: requeueSecs,
      retryLimit: 3,
      retryDelay: 30,
      expireInSeconds: 600,
    });

    console.log(
      `[Worker] ↺ Requeued clientId=${clientId} — new jobId=${newJobId} fires in ${requeueSecs}s`,
    );
    return;
  }

  // ── 2b. Silence confirmed — atomically claim all unprocessed messages ─
  // Multiple parallel jobs may fire for the same client when singletonKey
  // transitions from "created" → "active". The transaction below ensures
  // exactly one job wins: it fetches rows where agentProcessedAt IS NULL
  // and immediately stamps them. Any other job racing here sees 0 rows.
  console.log(
    `[Worker] Silence confirmed for clientId=${clientId} — claiming messages since ${windowStart}`,
  );

  const rows = await db.$transaction(async (tx) => {
    const messages = await tx.clientSMS.findMany({
      where: {
        clientId,
        sentBy: "Client",
        agentProcessedAt: null,
        createdAt: { gte: new Date(windowStart) },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, message: true },
    });

    if (messages.length === 0) return [];

    await tx.clientSMS.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { agentProcessedAt: new Date() },
    });

    return messages;
  });

  if (rows.length === 0) {
    console.log(
      `[Worker] No unprocessed messages for clientId=${clientId} — another job already handled this window (jobId=${job.id})`,
    );
    return;
  }

  console.log(
    `[Worker] Claimed ${rows.length} message(s) for clientId=${clientId}`,
  );
  rows.forEach((r, i) =>
    console.log(`[Worker]   [${i + 1}] "${r.message?.trim()}"`),
  );

  const combined = rows
    .map((r) => r.message?.trim())
    .filter(Boolean)
    .join("\n");

  // ── 3. Send combined message to AI agent ────────────────────────────
  console.log(
    `[Worker] Sending to AI agent for clientId=${clientId}:\n"""\n${combined}\n"""`,
  );

  await sendSMSToAgent({
    company_id: companyId,
    message: combined,
    send_from: sendFrom,
    send_to: sendTo,
    client_id: clientId,
  });

  console.log(
    `[Worker] ✓ Done — clientId=${clientId} jobId=${job.id} sent ${rows.length} message(s) to agent`,
  );
}

// pg-boss v12 WorkHandler receives an array of jobs
async function handler(jobs: Job<SmsAgentJobData>[]): Promise<void> {
  for (const job of jobs) {
    await processJob(job);
  }
}

export async function startWorker(): Promise<void> {
  const boss = await getBoss();

  await boss.work<SmsAgentJobData>(
    SMS_AGENT_QUEUE,
    { localConcurrency: 5 },
    handler,
  );

  console.log(`[Worker] Listening on queue "${SMS_AGENT_QUEUE}"`);
}
