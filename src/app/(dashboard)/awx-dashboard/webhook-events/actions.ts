"use server";

import { db } from "@/lib/db";
import { getBoss } from "@/lib/pgboss";
import {
  QUEUE_AUTHORIZE_NET,
  QUEUE_PLATFORM_BILLING,
  QUEUE_STRIPE,
} from "@/lib/queue-names";

export async function getWebhookEvents({
  status,
  gateway,
  companyId,
  page = 1,
  pageSize = 50,
}: {
  status?: string;
  gateway?: string;
  companyId?: number;
  page?: number;
  pageSize?: number;
}) {
  const where = {
    ...(status ? { status } : {}),
    ...(gateway ? { gateway } : {}),
    ...(companyId ? { companyId } : {}),
  };

  const [events, total] = await Promise.all([
    db.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.webhookEvent.count({ where }),
  ]);

  return { events, total, page, pageSize };
}

export async function retryWebhookEvent(eventId: string, gateway: string) {
  // Historical rows only — there is no handler left to process them.
  if (gateway === "PLATFORM_AUTHORIZE_NET") {
    return {
      success: false,
      message:
        "Authorize.Net platform billing is retired; this event cannot be replayed.",
    };
  }

  await db.webhookEvent.update({
    where: { eventId },
    data: { status: "PENDING", attempts: 0, lastError: null },
  });

  const boss = getBoss();
  const queue =
    gateway === "STRIPE"
      ? QUEUE_STRIPE
      : gateway === "PLATFORM_STRIPE"
        ? QUEUE_PLATFORM_BILLING
        : QUEUE_AUTHORIZE_NET;
  await boss.send(queue, { eventId });

  return { success: true };
}
