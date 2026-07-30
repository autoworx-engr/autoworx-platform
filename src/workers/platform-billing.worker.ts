import { db } from "@/lib/db";
import { getPlatformTransactionDetails } from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";

export async function processPlatformBillingEvent(eventId: string) {
  const webhookEvent = await db.webhookEvent.findUnique({
    where: { eventId },
  });

  if (!webhookEvent) throw new Error(`WebhookEvent not found: ${eventId}`);
  if (webhookEvent.status === "PROCESSED") return;

  const event = webhookEvent.payload as Record<string, any>;

  switch (event.eventType) {
    case "net.authorize.customer.subscription.created":
      break;
    case "net.authorize.payment.authcapture.created":
      await handleSubscriptionPayment(event.payload, webhookEvent.id);
      break;
    case "net.authorize.customer.subscription.cancelled":
    case "net.authorize.customer.subscription.terminated":
      await handleSubscriptionCancelled(event.payload);
      break;
    case "net.authorize.customer.subscription.suspended":
    case "net.authorize.customer.subscription.failed":
      await handleSubscriptionSuspended(event.payload);
      break;
    default:
      break;
  }

  await db.webhookEvent.update({
    where: { eventId },
    data: { status: "PROCESSED", processedAt: new Date() },
  });
}

async function handleSubscriptionPayment(
  payload: any,
  webhookEventDbId: number,
) {
  const status = payload.responseCode === 1 ? "PAID" : "FAILED";
  const authNetTransId = payload.id || payload.transactionId || payload.transId;

  if (!authNetTransId) {
    console.error("No transaction ID in platform payment payload:", payload);
    return;
  }

  let subscriptionId =
    payload.subscription?.id ||
    payload.subscription?.subscriptionId ||
    payload.subscriptionId;

  if (!subscriptionId) {
    try {
      const transaction = await getPlatformTransactionDetails(
        authNetTransId.toString(),
      );
      subscriptionId =
        transaction?.subscription?.id ||
        transaction?.subscriptionId ||
        transaction?.subscription?.subscriptionId;
    } catch (err) {
      throw err;
    }
  }

  if (!subscriptionId) {
    console.log(
      "Skipping platform payment without subscription reference:",
      payload,
    );
    return;
  }

  const subscription = await db.platformSubscription.findUnique({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    include: { billingCustomer: true, plan: true },
  });

  if (!subscription) {
    throw new Error(
      `PlatformSubscription not found for ARB ID: ${subscriptionId}`,
    );
  }

  // Backfill companyId on the WebhookEvent row for observability
  await db.webhookEvent.update({
    where: { id: webhookEventDbId },
    data: { companyId: subscription.companyId },
  });

  const existingInvoice = await db.platformInvoice.findFirst({
    where: { authNetTransId: authNetTransId.toString() },
  });

  if (existingInvoice) return;

  const amount =
    payload.authAmount ??
    payload.settleAmount ??
    payload.amount ??
    subscription.plan.price;

  await db.$transaction(async (tx) => {
    const invoice = await tx.platformInvoice.create({
      data: {
        billingCustomerId: subscription.billingCustomerId,
        subscriptionId: subscription.id,
        amount,
        status,
        authNetTransId: authNetTransId.toString(),
      },
    });

    if (status === "PAID") {
      await tx.platformPayment.create({
        data: {
          platformInvoiceId: invoice.id,
          amount,
          status: "SUCCESS",
          authNetTransId: authNetTransId.toString(),
        },
      });

      const currentEnd = subscription.currentPeriodEnd || new Date();
      const nextPeriodEnd = new Date(currentEnd);
      const intervalMonths = subscription.plan.interval === "YEARLY" ? 12 : 1;
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + intervalMonths);

      await tx.platformSubscription.update({
        where: { id: subscription.id },
        data: {
          status: PlatformSubscriptionStatus.ACTIVE,
          currentPeriodStart: currentEnd,
          currentPeriodEnd: nextPeriodEnd,
        },
      });
    } else {
      await tx.platformSubscription.update({
        where: { id: subscription.id },
        data: { status: PlatformSubscriptionStatus.PAST_DUE },
      });
      // TODO: Send dunning email
    }
  });
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionId = payload.id;
  if (!subscriptionId) return;

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: {
      status: PlatformSubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
      authNetSubscriptionId: null,
    },
  });
}

async function handleSubscriptionSuspended(payload: any) {
  const subscriptionId = payload.id;
  if (!subscriptionId) return;

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: { status: PlatformSubscriptionStatus.PAST_DUE },
  });
}
