import { db } from "@/lib/db";
import { queueProductionTelegramAlert } from "@/error-boundary/sendProductionTelegramAlert";
import {
  QUEUE_AUTHORIZE_NET,
  QUEUE_PLATFORM_BILLING,
  QUEUE_RECONCILE,
  QUEUE_STRIPE,
} from "@/lib/queue-names";
import type { PgBoss } from "pg-boss";

export async function registerReconciliationWorker(boss: PgBoss) {
  await boss.createQueue(QUEUE_RECONCILE);

  await boss.schedule(QUEUE_RECONCILE, "0 * * * *", {});

  await boss.work(QUEUE_RECONCILE, async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    // Give up after 12 hours — ~10 reconciliation cycles × 5 pg-boss retries each
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Terminal: permanently stuck events → mark FAILED so they stop cycling
    const gaveUp = await db.webhookEvent.findMany({
      where: { status: "PENDING", receivedAt: { lt: twelveHoursAgo } },
      select: { id: true, eventId: true, gateway: true, lastError: true },
      take: 100,
    });

    if (gaveUp.length > 0) {
      await db.webhookEvent.updateMany({
        where: { id: { in: gaveUp.map((e) => e.id) } },
        data: { status: "FAILED" },
      });
      for (const event of gaveUp) {
        console.error(`[reconciliation] gave up on event`, {
          eventId: event.eventId,
          gateway: event.gateway,
          lastError: event.lastError,
        });
      }

      // A permanently failed platform-billing event means a charge or a
      // subscription state change never made it into our records — that
      // needs a human, not just a log line nobody reads.
      const billingGaveUp = gaveUp.filter(
        (e) => e.gateway === "PLATFORM_STRIPE",
      );
      if (billingGaveUp.length > 0) {
        queueProductionTelegramAlert({
          errorMessage: `${billingGaveUp.length} platform billing webhook event(s) permanently failed: ${billingGaveUp
            .map((e) => `${e.gateway}:${e.eventId}`)
            .join(", ")}`,
          statusCode: 500,
          context: {
            route: "reconciliation.worker",
            method: "NODE",
            requestUrl: "",
            eventName: "platform_billing_event_gave_up",
          },
        });
      }
    }

    const stuck = await db.webhookEvent.findMany({
      where: {
        status: "PENDING",
        receivedAt: { gte: twelveHoursAgo, lt: twoHoursAgo },
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

    const toJobs = (events: typeof stuck) =>
      events.map((e) => ({ data: { eventId: e.eventId } }));

    const stripeJobs = toJobs(stuck.filter((e) => e.gateway === "STRIPE"));
    const platformJobs = toJobs(
      stuck.filter((e) => e.gateway === "PLATFORM_STRIPE"),
    );
    const authNetJobs = toJobs(
      stuck.filter((e) => e.gateway === "AUTHORIZE_NET"),
    );

    await Promise.all([
      stripeJobs.length > 0
        ? boss.insert(QUEUE_STRIPE, stripeJobs)
        : Promise.resolve(),
      authNetJobs.length > 0
        ? boss.insert(QUEUE_AUTHORIZE_NET, authNetJobs)
        : Promise.resolve(),
      platformJobs.length > 0
        ? boss.insert(QUEUE_PLATFORM_BILLING, platformJobs)
        : Promise.resolve(),
    ]);
  });

  console.log("[pg-boss] reconciliation worker registered");
}
