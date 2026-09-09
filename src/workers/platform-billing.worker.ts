import { db } from "@/lib/db";
import { processPlatformStripeEvent } from "@/workers/platform-stripe.worker";

/**
 * Queue entry point for platform billing (AutoWorx billing its tenant
 * companies). Stripe is the only gateway; historical
 * gateway: "PLATFORM_AUTHORIZE_NET" rows predate the migration and are left
 * for the webhook-events browser to display rather than reprocessed.
 */
export async function processPlatformBillingEvent(eventId: string) {
  const webhookEvent = await db.webhookEvent.findUnique({
    where: { eventId },
  });

  if (!webhookEvent) throw new Error(`WebhookEvent not found: ${eventId}`);
  if (webhookEvent.status === "PROCESSED") return;

  if (webhookEvent.gateway !== "PLATFORM_STRIPE") {
    await db.webhookEvent.update({
      where: { eventId },
      data: {
        status: "FAILED",
        lastError: `Gateway ${webhookEvent.gateway} is retired — no handler`,
      },
    });
    return;
  }

  await processPlatformStripeEvent(webhookEvent);

  await db.webhookEvent.update({
    where: { eventId },
    data: { status: "PROCESSED", processedAt: new Date() },
  });
}
