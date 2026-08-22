/**
 * Node-only: process-level error hooks + pg-boss workers.
 * Loaded only from instrumentation.ts when NEXT_RUNTIME is nodejs
 * so Edge bundles never reference process.on or pg-boss.
 */

import { queueProductionTelegramAlert } from "./error-boundary/sendProductionTelegramAlert";

function notify(
  reason: unknown,
  label: "unhandledRejection" | "uncaughtException",
): void {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "object" && reason !== null
        ? JSON.stringify(reason, null, 2)
        : String(reason);

  queueProductionTelegramAlert({
    errorMessage: `[${label}] ${msg}`,
    statusCode: 500,
    stack: reason instanceof Error ? (reason.stack ?? null) : null,
    context: {
      route: `/_process/${label}`,
      method: "NODE",
      requestUrl: "",
      eventName: `process_${label}`,
    },
  });
}

process.on("unhandledRejection", (reason: unknown) => {
  notify(reason, "unhandledRejection");
});

process.on("uncaughtException", (err: Error) => {
  notify(err, "uncaughtException");
});

// ── pg-boss workers ────────────────────────────────────────────────────────

const { getBoss } = await import("@/lib/pgboss");
const { db } = await import("@/lib/db");
const { processStripePayment } =
  await import("@/workers/stripe-payment.worker");
const { recordWebhookFailure } = await import("@/workers/recordWebhookFailure");
const { processAuthorizeNetPayment } =
  await import("@/workers/authorize-net-payment.worker");
const { registerReconciliationWorker } =
  await import("@/workers/reconciliation.worker");
const { processPlatformBillingEvent } =
  await import("@/workers/platform-billing.worker");
const { QUEUE_STRIPE, QUEUE_AUTHORIZE_NET, QUEUE_PLATFORM_BILLING } =
  await import("@/lib/queue-names");

const boss = getBoss();

boss.on("error", (err: Error) => {
  console.error("[pg-boss] error:", err);
});

await boss.start();
console.log("[pg-boss] started");

const retryOptions = { retryLimit: 5, retryDelay: 60, retryBackoff: true };
await Promise.all([
  boss.createQueue(QUEUE_STRIPE, retryOptions),
  boss.createQueue(QUEUE_AUTHORIZE_NET, retryOptions),
  boss.createQueue(QUEUE_PLATFORM_BILLING, retryOptions),
]);

await boss.work(QUEUE_STRIPE, async (jobs: { data: { eventId: string } }[]) => {
  for (const job of jobs) {
    try {
      await processStripePayment(job.data.eventId);
    } catch (err) {
      await recordWebhookFailure(job.data.eventId, err, "Stripe");
      throw err; // pg-boss sees the throw and retries
    }
  }
});

await boss.work(
  QUEUE_AUTHORIZE_NET,
  async (jobs: { data: { eventId: string } }[]) => {
    for (const job of jobs) {
      try {
        await processAuthorizeNetPayment(job.data.eventId);
      } catch (err) {
        await recordWebhookFailure(job.data.eventId, err, "Authorize.Net");
        throw err; // pg-boss sees the throw and retries
      }
    }
  },
);

await boss.work(
  QUEUE_PLATFORM_BILLING,
  async (jobs: { data: { eventId: string } }[]) => {
    for (const job of jobs) {
      try {
        await processPlatformBillingEvent(job.data.eventId);
      } catch (err: any) {
        await db.webhookEvent.update({
          where: { eventId: job.data.eventId },
          data: { lastError: err?.message ?? "Unknown error" },
        });
        throw err;
      }
    }
  },
);

await registerReconciliationWorker(boss);

console.log("[pg-boss] workers registered");
