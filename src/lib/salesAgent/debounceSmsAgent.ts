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

  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sms-agent/debounce`, {
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
  } catch (err) {
    console.error("[sms-agent] debounce enqueue error:", err);
  }
}
