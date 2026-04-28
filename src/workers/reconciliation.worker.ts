import { db } from "@/lib/db";
import { QUEUE_AUTHORIZE_NET, QUEUE_STRIPE } from "@/lib/queue-names";
import type { PgBoss } from "pg-boss";

export async function registerReconciliationWorker(boss: PgBoss) {
  await boss.createQueue("reconcile-webhooks");

  await boss.schedule("reconcile-webhooks", "0 * * * *", {});

  await boss.work("reconcile-webhooks", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const stuck = await db.webhookEvent.findMany({
      where: {
        status: "PENDING",
        receivedAt: { lt: twoHoursAgo },
      },
      select: {
        id: true,
        eventId: true,
        gateway: true,
        attempts: true,
        receivedAt: true,
        lastError: true,
      },
      take: 100,
    });

    if (stuck.length === 0) return;

    console.error(
      `[reconciliation] ${stuck.length} stuck webhook event(s) found:`,
    );
    for (const event of stuck) {
      console.error(`[reconciliation] stuck event`, {
        eventId: event.eventId,
        gateway: event.gateway,
        attempts: event.attempts,
        receivedAt: event.receivedAt,
        lastError: event.lastError,
      });
    }

    const stripeJobs = stuck
      .filter((e) => e.gateway === "STRIPE")
      .map((e) => ({ data: { eventId: e.eventId } }));
    const authNetJobs = stuck
      .filter((e) => e.gateway !== "STRIPE")
      .map((e) => ({ data: { eventId: e.eventId } }));

    await Promise.all([
      stripeJobs.length > 0
        ? boss.insert(QUEUE_STRIPE, stripeJobs)
        : Promise.resolve(),
      authNetJobs.length > 0
        ? boss.insert(QUEUE_AUTHORIZE_NET, authNetJobs)
        : Promise.resolve(),
    ]);
  });

  console.log("[pg-boss] reconciliation worker registered");
}
