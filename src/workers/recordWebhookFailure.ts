import { db } from "@/lib/db";
import { sendPaymentFailedNotification } from "@/lib/notification/payment-notify";

/**
 * Record a payment-worker failure and alert shop admins on the FIRST failure only.
 *
 * Called from the pg-boss worker catch blocks. The original payment error is
 * passed in and MUST be re-thrown by the caller so pg-boss still retries — this
 * helper only records/notifies and never throws (its own errors are swallowed so
 * they can't mask the real payment error in pg-boss's job output).
 */
export async function recordWebhookFailure(
  eventId: string,
  err: unknown,
  fallbackGateway: string,
): Promise<void> {
  const errMsg =
    err instanceof Error ? err.message : String(err ?? "Unknown error");

  try {
    // Read BEFORE updating so we can tell first failure (lastError IS NULL)
    // from a retry, and avoid notification spam on retries 2..5.
    const existing = await db.webhookEvent.findUnique({
      where: { eventId },
      select: { lastError: true, companyId: true, gateway: true },
    });

    await db.webhookEvent.update({
      where: { eventId },
      data: { lastError: errMsg },
    });

    const isFirstFailure = !existing?.lastError;
    if (!isFirstFailure) return;

    if (existing?.companyId) {
      await sendPaymentFailedNotification({
        companyId: existing.companyId,
        gateway: existing.gateway ?? fallbackGateway,
        eventId,
        error: errMsg,
      });
    } else {
      // No companyId means we can't identify which shop to notify — these are
      // the worst failures (unparseable payloads). Make it loud and greppable.
      console.error(
        `[recordWebhookFailure] payment failed with no companyId — cannot notify admins`,
        {
          eventId,
          gateway: existing?.gateway ?? fallbackGateway,
          error: errMsg,
        },
      );
    }
  } catch (recordErr) {
    // Never let failure-recording mask the original payment error.
    console.error("[recordWebhookFailure]", eventId, recordErr);
  }
}

/**
 * Mark a webhook event as permanently unprocessable (a "poison" message).
 *
 * Used when the stored payload is structurally broken — missing required fields
 * or invalid JSON — which is deterministic: it will fail identically on every
 * retry. We set status FAILED and return WITHOUT throwing so pg-boss completes
 * the job instead of burning 5 retries + 12h of reconciliation cycles.
 */
export async function markWebhookPoison(
  eventId: string,
  reason: string,
): Promise<void> {
  console.error(`[markWebhookPoison] unprocessable payload — marking FAILED`, {
    eventId,
    reason,
  });
  try {
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: "FAILED", lastError: `Unprocessable payload: ${reason}` },
    });
  } catch (e) {
    console.error("[markWebhookPoison]", eventId, e);
  }
}
