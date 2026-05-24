import { db } from "../lib/db";
import { getBoss, SMS_AGENT_QUEUE } from "../lib/pgboss/client";
import {
  DEBOUNCE_SECONDS,
  SmsAgentJobData,
} from "../lib/pgboss/debounceSmsAgent";
import { sendSMSToAgent } from "../service/ai-agent/api";
import type { Job } from "pg-boss";

async function processJob(job: Job<SmsAgentJobData>): Promise<void> {
  const { clientId, companyId, sendFrom, sendTo, windowStart } = job.data;

  console.log(
    `[Worker] Job received — jobId=${job.id} clientId=${clientId} windowStart=${windowStart}`,
  );

  // Collect every unprocessed message sent within the 90-second window that
  // started with the first message. Upper bound prevents pulling in messages
  // from a later conversation if this job fires slightly late.
  const windowEnd = new Date(
    new Date(windowStart).getTime() + DEBOUNCE_SECONDS * 1000,
  );

  const rows = await db.$transaction(async (tx) => {
    const messages = await tx.clientSMS.findMany({
      where: {
        clientId,
        sentBy: "Client",
        agentProcessedAt: null,
        createdAt: { gte: new Date(windowStart), lte: windowEnd },
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
      `[Worker] No unprocessed messages for clientId=${clientId} — skipping job ${job.id}`,
    );
    return;
  }

  const combined = rows
    .map((r) => r.message?.trim())
    .filter(Boolean)
    .join("\n");

  console.log(
    `[Worker] Sending ${rows.length} message(s) to agent for clientId=${clientId}:\n"""\n${combined}\n"""`,
  );

  rows.forEach((r, i) =>
    console.log(`[Worker]   [${i + 1}] "${r.message?.trim()}"`),
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

async function handler(jobs: Job<SmsAgentJobData>[]): Promise<void> {
  for (const job of jobs) {
    try {
      await processJob(job);
    } catch (err) {
      console.error(`[Worker] Job failed:`, err);
    }
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
