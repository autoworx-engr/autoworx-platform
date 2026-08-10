export interface SmsAgentDebounceParams {
  clientId: number;
  companyId: number;
  sendFrom: string;
  sendTo: string;
  windowStart?: string; // caller should pass dbMessage.createdAt.toISOString()
}

/**
 * Called on every incoming SMS from a client. Hands the 90-second debounce
 * window off to autoworx-automation-backend, which owns the queue, combines
 * every message in the window, and forwards the result to the Sales Agent API.
 */
export async function debounceSmsAgent(
  params: SmsAgentDebounceParams,
): Promise<void> {
  const { clientId, companyId, sendFrom, sendTo, windowStart } = params;
  const tag = `[sms-agent][clientId=${clientId}]`;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sms-agent/debounce`;

  console.log(
    `${tag} triggering automation-backend debounce — url=${url} from=${sendFrom} to=${sendTo}`,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        companyId,
        sendFrom,
        sendTo,
        windowStart: windowStart ?? new Date().toISOString(),
      }),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(
        `${tag} automation-backend returned ${response.status} — ${responseBody}`,
      );
      return;
    }

    console.log(
      `${tag} automation-backend accepted debounce request — ${responseBody}`,
    );
  } catch (err) {
    console.error(`${tag} failed to reach automation-backend:`, err);
  }
}
