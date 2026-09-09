import { db } from "@/lib/db";
import { getPlatformStripeClient } from "@/lib/platform-billing/stripe/client";
import { PlatformSubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

export const LIVE_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
  "trialing",
  "active",
  "past_due",
]);

const STATUS_MAP: Record<
  Stripe.Subscription.Status,
  PlatformSubscriptionStatus
> = {
  trialing: PlatformSubscriptionStatus.TRIALING,
  active: PlatformSubscriptionStatus.ACTIVE,
  past_due: PlatformSubscriptionStatus.PAST_DUE,
  canceled: PlatformSubscriptionStatus.CANCELED,
  unpaid: PlatformSubscriptionStatus.UNPAID,
  // These map to UNPAID, not PAST_DUE, because PAST_DUE deliberately keeps
  // entitlements on as a grace period for a customer who has paid before.
  // `incomplete` means the very first payment never succeeded, and `paused`
  // means no invoices are being generated at all — neither has earned access,
  // so they must fail closed.
  incomplete: PlatformSubscriptionStatus.UNPAID,
  incomplete_expired: PlatformSubscriptionStatus.UNPAID,
  paused: PlatformSubscriptionStatus.UNPAID,
};

/**
 * checkout.session.completed fires alongside customer.subscription.created,
 * which carries everything needed to sync the subscription — so this only
 * backfills the customer link as a safety net. createPlatformCheckoutSession
 * already sets it before the session is created.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  const companyId = Number(session.metadata?.companyId);
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!companyId || !stripeCustomerId) return;

  await db.platformBillingCustomer.updateMany({
    where: { companyId, stripeCustomerId: null },
    data: { stripeCustomerId },
  });
}

export async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  webhookEventDbId: number,
) {
  const companyId = Number(subscription.metadata?.companyId);
  if (!companyId) {
    // Throw rather than return: the dispatcher marks the event PROCESSED on
    // a clean return, which would bury an unsynced subscription with no
    // trace. Failing keeps it visible in the webhook-events browser.
    throw new Error(
      `Stripe subscription ${subscription.id} has no companyId metadata — cannot sync`,
    );
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;

  const priorSubscriptionRow = await db.platformSubscription.findUnique({
    where: { companyId },
    select: { stripeSubscriptionId: true },
  });
  if (
    priorSubscriptionRow?.stripeSubscriptionId &&
    priorSubscriptionRow.stripeSubscriptionId !== subscription.id
  ) {
    console.error(
      `[platform-stripe] ALERT: company ${companyId} already had Stripe subscription ${priorSubscriptionRow.stripeSubscriptionId} on file; now receiving events for a different subscription ${subscription.id}. This likely means two live Stripe subscriptions exist for this company — investigate in the Stripe dashboard.`,
    );

    // One row per company, so an event for a different subscription would
    // overwrite it. A dead subscription must never displace the live one
    // that's actually billing — usually a late event for one already replaced.
    if (!LIVE_STRIPE_STATUSES.has(subscription.status)) {
      console.error(
        `[platform-stripe] ignoring ${subscription.status} subscription ${subscription.id}; keeping ${priorSubscriptionRow.stripeSubscriptionId} on company ${companyId}`,
      );
      return;
    }
  }

  const billingCustomer = await db.platformBillingCustomer.upsert({
    where: { companyId },
    update: { stripeCustomerId: subscription.customer as string },
    create: { companyId, stripeCustomerId: subscription.customer as string },
  });

  await db.webhookEvent.update({
    where: { id: webhookEventDbId },
    data: { companyId },
  });

  // Prefer metadata.planId; fall back to matching stripePriceId for events
  // where metadata might lag (e.g. a super-admin price swap done directly
  // in Stripe rather than through our changePlan action).
  let planId: string | undefined = subscription.metadata?.planId;
  if (!planId && priceId) {
    const planByPrice = await db.platformPlan.findUnique({
      where: { stripePriceId: priceId },
    });
    planId = planByPrice?.id;
  }
  if (!planId) {
    throw new Error(
      `Could not resolve a PlatformPlan for Stripe subscription ${subscription.id} (price ${priceId ?? "unknown"})`,
    );
  }

  const status =
    STATUS_MAP[subscription.status] ?? PlatformSubscriptionStatus.PAST_DUE;
  const currentPeriodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const fields = {
    planId,
    stripeSubscriptionId: subscription.id,
    status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart,
    currentPeriodEnd,
    billingAnchor: currentPeriodEnd,
  };

  await db.platformSubscription.upsert({
    where: { companyId },
    update: fields,
    create: {
      companyId,
      billingCustomerId: billingCustomer.id,
      ...fields,
    },
  });

  if (subscription.trial_start && !billingCustomer.trialConsumedAt) {
    await db.platformBillingCustomer.update({
      where: { id: billingCustomer.id },
      data: { trialConsumedAt: new Date(subscription.trial_start * 1000) },
    });
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  await db.platformSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: PlatformSubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
    },
  });
}

/**
 * Returns the local PlatformSubscription for a Stripe subscription id,
 * creating it from Stripe first if it doesn't exist yet.
 *
 * Stripe fires invoice.paid and customer.subscription.created in the same
 * burst with no ordering guarantee, and on a brand-new signup invoice.paid
 * reliably arrives first — before the event that creates this row. Waiting
 * for the pg-boss retry works, but that retry has a hard 60s floor plus
 * backoff and polling (~2 minutes observed), during which the customer sees
 * an empty payment history right after paying. Fetching from Stripe here
 * makes the invoice handler self-sufficient regardless of arrival order.
 */
export async function resolveSubscriptionRow(
  stripeSubscriptionId: string,
  webhookEventDbId: number,
) {
  const existing = await db.platformSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
  if (existing) return existing;

  const stripe = getPlatformStripeClient();
  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  await upsertSubscriptionFromStripe(stripeSubscription, webhookEventDbId);

  return db.platformSubscription.findUnique({
    where: { stripeSubscriptionId },
  });
}
