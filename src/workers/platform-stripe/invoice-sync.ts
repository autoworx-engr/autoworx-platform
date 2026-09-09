import { db } from "@/lib/db";
import type Stripe from "stripe";
import { resolveSubscriptionRow } from "./subscription-sync";

export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  webhookEventDbId: number,
) {
  const stripeSubscriptionId =
    invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof stripeSubscriptionId === "string"
      ? stripeSubscriptionId
      : stripeSubscriptionId?.id;

  if (!subscriptionId) {
    // Non-subscription invoice (e.g. one-off) — nothing for us to record.
    return;
  }

  const subscription = await resolveSubscriptionRow(
    subscriptionId,
    webhookEventDbId,
  );

  if (!subscription) {
    throw new Error(
      `PlatformSubscription not found for Stripe subscription: ${subscriptionId}`,
    );
  }

  await db.webhookEvent.update({
    where: { id: webhookEventDbId },
    data: { companyId: subscription.companyId },
  });

  const isPaid = invoice.status === "paid";
  const newStatus = isPaid ? "PAID" : "FAILED";
  const amount = (isPaid ? invoice.amount_paid : invoice.amount_due) / 100;
  const firstPayment = invoice.payments?.data?.[0]?.payment;
  const paymentIntentId =
    typeof firstPayment?.payment_intent === "string"
      ? firstPayment.payment_intent
      : firstPayment?.payment_intent?.id;

  const existingInvoice = await db.platformInvoice.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });

  // Only a true redelivery of the same outcome is a no-op. Smart Retries
  // means the same invoice legitimately transitions FAILED -> PAID when a
  // retry succeeds, and that must still be recorded.
  if (existingInvoice?.status === newStatus) return;

  // ...but never the other way. A late or retried payment_failed event for
  // an invoice that has since been paid would otherwise mark a real payment
  // as FAILED and orphan its payment row.
  if (existingInvoice?.status === "PAID" && !isPaid) {
    console.warn(
      `[platform-stripe] ignoring ${invoice.status} event for already-paid invoice ${invoice.id}`,
    );
    return;
  }

  await db.$transaction(async (tx) => {
    const record = existingInvoice
      ? await tx.platformInvoice.update({
          where: { id: existingInvoice.id },
          data: { amount, status: newStatus },
        })
      : await tx.platformInvoice.create({
          data: {
            billingCustomerId: subscription.billingCustomerId,
            subscriptionId: subscription.id,
            amount,
            status: newStatus,
            stripeInvoiceId: invoice.id,
          },
        });

    if (isPaid) {
      const existingPayment = await tx.platformPayment.findFirst({
        where: { platformInvoiceId: record.id, status: "SUCCESS" },
      });
      if (!existingPayment) {
        await tx.platformPayment.create({
          data: {
            platformInvoiceId: record.id,
            amount,
            status: "SUCCESS",
            stripePaymentIntentId: paymentIntentId,
          },
        });
      }
    }
    // Dunning itself is Stripe's job — Smart Retries plus the Dashboard's
    // post-retry action drive past_due -> unpaid/canceled, and the
    // customer.subscription.updated event that follows syncs our status.
  });
}
