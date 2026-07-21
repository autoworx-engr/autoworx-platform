import { getBoss, SMS_AGENT_QUEUE } from "./client";

export const DEBOUNCE_SECONDS = 90;

export interface SmsAgentJobData {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
  windowStart: string; // ISO timestamp — marks start of this debounce window
}

export async function debounceSmsAgent(params: {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
  windowStart?: string; // caller should pass dbMessage.createdAt.toISOString()
}): Promise<void> {
  const { clientId, companyId, sendFrom, sendTo, windowStart } = params;

  console.log(
    `[Debounce] Incoming SMS — clientId=${clientId} companyId=${companyId} from=${sendFrom} to=${sendTo}`,
  );

  const boss = await getBoss();

  const jobData: SmsAgentJobData = {
    clientId,
    companyId,
    sendFrom,
    sendTo,
    windowStart: windowStart ?? new Date().toISOString(),
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
