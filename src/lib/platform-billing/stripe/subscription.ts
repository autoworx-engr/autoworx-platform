import "server-only";
import type Stripe from "stripe";
import { getPlatformStripeClient } from "./client";

/**
 * Swaps a live subscription onto a different Price. Prices are immutable in
 * Stripe, so both a plan upgrade/downgrade and a super-admin custom-price
 * override go through this same "replace the subscription item" call — there
 * is no API for changing an existing Price's amount in place.
 */
export async function changePlatformStripeSubscriptionPrice(params: {
  stripeSubscriptionId: string;
  newStripePriceId: string;
  newPlanId: string;
  prorationBehavior?: Stripe.SubscriptionUpdateParams.ProrationBehavior;
}) {
  const {
    stripeSubscriptionId,
    newStripePriceId,
    newPlanId,
    prorationBehavior = "create_prorations",
  } = params;
  const stripe = getPlatformStripeClient();

  const subscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error(
      `Stripe subscription ${stripeSubscriptionId} has no items to update`,
    );
  }

  // Keep metadata.planId current so later webhook events (renewals, further
  // changes) resolve the right plan without falling back to price-matching.
  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, price: newStripePriceId }],
    proration_behavior: prorationBehavior,
    metadata: { ...subscription.metadata, planId: newPlanId },
  });
}

/** Reversible — set back to false any time before period end to undo. */
export async function setPlatformStripeCancelAtPeriodEnd(
  stripeSubscriptionId: string,
  cancelAtPeriodEnd: boolean,
) {
  const stripe = getPlatformStripeClient();
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/** Immediate, non-reversible cancel — for super-admin use, not the owner-facing flow. */
export async function cancelPlatformStripeSubscriptionImmediately(
  stripeSubscriptionId: string,
) {
  const stripe = getPlatformStripeClient();
  return stripe.subscriptions.cancel(stripeSubscriptionId);
}

/**
 * What the customer's next bill becomes if they switch to this price, so the
 * confirm step can show a real number instead of a surprise next cycle.
 * Prorations are deferred (create_prorations), so the charge lands on the
 * upcoming invoice rather than today.
 */
export async function previewPlatformPlanChange(params: {
  stripeSubscriptionId: string;
  newStripePriceId: string;
}) {
  const stripe = getPlatformStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    params.stripeSubscriptionId,
  );
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(
      `Stripe subscription ${params.stripeSubscriptionId} has no items to preview`,
    );
  }

  const preview = await stripe.invoices.createPreview({
    customer: subscription.customer as string,
    subscription: params.stripeSubscriptionId,
    subscription_details: {
      items: [{ id: item.id, price: params.newStripePriceId }],
      proration_behavior: "create_prorations",
    },
  });

  const prorationCents = preview.lines.data
    .filter((line) => {
      const parent = line.parent;
      return Boolean(
        parent?.subscription_item_details?.proration ||
        parent?.invoice_item_details?.proration,
      );
    })
    .reduce((sum, line) => sum + line.amount, 0);

  return {
    prorationAmount: prorationCents / 100,
    nextInvoiceTotal: preview.total / 100,
    nextBillDate: item.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  };
}
