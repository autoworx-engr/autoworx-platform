export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getBoss } = await import("@/lib/pgboss");
  const { db } = await import("@/lib/db");
  const { processStripePayment } =
    await import("@/workers/stripe-payment.worker");
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

  await boss.work(
    QUEUE_STRIPE,
    async (jobs: { data: { eventId: string } }[]) => {
      for (const job of jobs) {
        try {
          await processStripePayment(job.data.eventId);
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

  await boss.work(
    QUEUE_AUTHORIZE_NET,
    async (jobs: { data: { eventId: string } }[]) => {
      for (const job of jobs) {
        try {
          await processAuthorizeNetPayment(job.data.eventId);
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

  const shutdown = async () => {
    await boss.stop({ timeout: 10000 });
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log("[pg-boss] workers registered");
}
