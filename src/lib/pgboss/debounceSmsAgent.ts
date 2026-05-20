import { getBoss, SMS_AGENT_QUEUE } from "./client";

export const DEBOUNCE_SECONDS = 90;

export interface SmsAgentJobData {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
  windowStart: string; // ISO timestamp — marks start of this debounce window
}

/**
 * Called on every incoming SMS from a client.
 *
 * Uses pg-boss `singletonKey` to guarantee only ONE pending job per client:
 *   - First SMS of a window  → job created, fires in DEBOUNCE_SECONDS
 *   - Subsequent SMS in window → send() returns null (deduplicated, no new job)
 *   - Worker checks latest SMS time; if client still typing it requeues the job
 *     with a fresh delay, preserving the original windowStart so all messages
 *     in the window are combined when the agent is eventually called.
 */
export async function debounceSmsAgent(params: {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
}): Promise<void> {
  const { clientId, companyId, sendFrom, sendTo } = params;

  console.log(
    `[Debounce] Incoming SMS — clientId=${clientId} companyId=${companyId} from=${sendFrom} to=${sendTo}`,
  );

  const boss = await getBoss();

  const jobData: SmsAgentJobData = {
    clientId,
    companyId,
    sendFrom,
    sendTo,
    windowStart: new Date().toISOString(),
  };

  const jobId = await boss.send(SMS_AGENT_QUEUE, jobData, {
    singletonKey: `client-${clientId}`,
    startAfter: DEBOUNCE_SECONDS,
    retryLimit: 3,
    retryDelay: 30,
    expireInSeconds: 600,
  });

  if (jobId) {
    console.log(
      `[Debounce] ✓ New window opened — clientId=${clientId} jobId=${jobId} fires in ${DEBOUNCE_SECONDS}s`,
    );
  } else {
    console.log(
      `[Debounce] Window already open for clientId=${clientId} — skipping (singletonKey deduplication)`,
    );
  }
}
