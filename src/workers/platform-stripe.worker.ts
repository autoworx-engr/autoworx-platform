import { db } from "@/lib/db";
import { getPlatformStripeClient } from "@/lib/platform-billing/stripe/client";
import { PlatformSubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

const STATUS_MAP: Record<
  Stripe.Subscription.Status,
  PlatformSubscriptionStatus
> = {
  trialing: PlatformSubscriptionStatus.TRIALING,
  active: PlatformSubscriptionStatus.ACTIVE,
  past_due: PlatformSubscriptionStatus.PAST_DUE,
  canceled: PlatformSubscriptionStatus.CANCELED,
  unpaid: PlatformSubscriptionStatus.UNPAID,
  // Not reachable via our Checkout-only, single-item flow, but Stripe's type
  // covers them — fall back to PAST_DUE rather than silently no-op.
  incomplete: PlatformSubscriptionStatus.PAST_DUE,
  incomplete_expired: PlatformSubscriptionStatus.PAST_DUE,
  paused: PlatformSubscriptionStatus.PAST_DUE,
};

export async function processPlatformStripeEvent(webhookEvent: {
  id: number;
  payload: unknown;
}) {
  const event = webhookEvent.payload as Stripe.Event;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscriptionFromStripe(
        event.data.object as Stripe.Subscription,
        webhookEvent.id,
      );
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoiceEvent(
        event.data.object as Stripe.Invoice,
        webhookEvent.id,
      );
      break;
    case "payment_method.attached":
      await handlePaymentMethodAttached(
        event.data.object as Stripe.PaymentMethod,
      );
      break;
    case "payment_method.detached":
      await handlePaymentMethodDetached(
        event.data.object as Stripe.PaymentMethod,
      );
      break;
    default:
      break;
  }
}

/**
 * checkout.session.completed fires alongside customer.subscription.created,
 * which already carries everything needed to upsert PlatformSubscription
 * (status, periods, metadata) — so this handler only does the one thing that
 * event doesn't cover: stamping trialConsumedAt from the session itself.
 * Actual subscription upsert lives in upsertSubscriptionFromStripe below.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = Number(session.metadata?.companyId);
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!companyId || !stripeCustomerId) return;

  // Defensive backfill only — createPlatformCheckoutSession already links
  // stripeCustomerId before creating the session. The subscription upsert
  // and trial stamp happen in upsertSubscriptionFromStripe, triggered by the
  // customer.subscription.created event that fires alongside this one.
  await db.platformBillingCustomer.updateMany({
    where: { companyId, stripeCustomerId: null },
    data: { stripeCustomerId },
  });
}

async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  webhookEventDbId: number,
) {
  const companyId = Number(subscription.metadata?.companyId);
  if (!companyId) {
    console.error(
      "[platform-stripe] subscription missing companyId metadata:",
      subscription.id,
    );
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;

  // Defense in depth: this upsert is keyed on companyId, so it always wins
  // — if a different live Stripe subscription somehow already exists for
  // this company (the checkout-time guard is the real prevention, but a
  // manual Stripe Dashboard action or a bug elsewhere could still cause
  // this), we'd otherwise silently start tracking whichever one's webhook
  // processes last with zero visibility into the other one still billing
  // in the background. Loudly alert instead of staying silent.
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
    console.error(
      "[platform-stripe] could not resolve plan for subscription:",
      subscription.id,
    );
    return;
  }

  const status =
    STATUS_MAP[subscription.status] ?? PlatformSubscriptionStatus.PAST_DUE;
  const currentPeriodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await db.platformSubscription.upsert({
    where: { companyId },
    update: {
      planId,
      stripeSubscriptionId: subscription.id,
      status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart,
      currentPeriodEnd,
      billingAnchor: currentPeriodEnd,
    },
    create: {
      companyId,
      billingCustomerId: billingCustomer.id,
      planId,
      stripeSubscriptionId: subscription.id,
      status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart,
      currentPeriodEnd,
      billingAnchor: currentPeriodEnd,
    },
  });

  if (subscription.trial_start && !billingCustomer.trialConsumedAt) {
    await db.platformBillingCustomer.update({
      where: { id: billingCustomer.id },
      data: { trialConsumedAt: new Date(subscription.trial_start * 1000) },
    });
  }
}

/**
 * Keeps PlatformPaymentMethod in sync so the billing UI can show which card
 * is on file — nothing on the Stripe path wrote this table before, so it was
 * only ever populated by the legacy Authorize.Net flow.
 *
 * Both flows that attach a card here (initial Checkout, and a card update
 * through the Customer Portal) end with the newly attached card being the one
 * we bill, so the fresh card becomes default and any previous one is cleared.
 */
async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod,
) {
  const stripeCustomerId =
    typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id;
  if (!stripeCustomerId) return;

  const billingCustomer = await db.platformBillingCustomer.findUnique({
    where: { stripeCustomerId },
  });
  if (!billingCustomer) return;

  const card = paymentMethod.card;
  const expiry = card
    ? `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}`
    : null;

  await db.$transaction(async (tx) => {
    await tx.platformPaymentMethod.updateMany({
      where: { billingCustomerId: billingCustomer.id, isDefault: true },
      data: { isDefault: false },
    });
    await tx.platformPaymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethod.id },
      update: {
        cardType: card?.brand ?? null,
        last4: card?.last4 ?? null,
        expiry,
        isDefault: true,
      },
      create: {
        billingCustomerId: billingCustomer.id,
        stripePaymentMethodId: paymentMethod.id,
        cardType: card?.brand ?? null,
        last4: card?.last4 ?? null,
        expiry,
        isDefault: true,
      },
    });
  });
}

async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod,
) {
  // The detached event's `customer` is already null, so match on the id.
  await db.platformPaymentMethod.deleteMany({
    where: { stripePaymentMethodId: paymentMethod.id },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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
 * reliably arrives first — before the event that creates this row. Failing
 * and waiting for the pg-boss retry works, but that retry has a hard 60s
 * floor plus backoff and polling (~2 minutes observed), during which the
 * customer sees an empty payment history right after paying. Fetching the
 * subscription from Stripe here makes this handler self-sufficient, so the
 * invoice records on the first attempt regardless of arrival order.
 */
async function resolveSubscriptionRow(
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

async function handleInvoiceEvent(
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
    // Genuinely unresolvable (e.g. subscription metadata is missing the
    // companyId we set at checkout) — throw so pg-boss retries and the
    // failure stays visible in the webhook-events browser.
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
  // means the same invoice legitimately transitions FAILED -> PAID (a
  // retry succeeding) — that must still update the row and record the
  // payment, not be skipped just because a failed attempt was recorded
  // first.
  if (existingInvoice?.status === newStatus) return;

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
    // No dunning TODO here — Smart Retries + the Dashboard's post-retry
    // action own the past_due -> unpaid/canceled transition; the
    // customer.subscription.updated event that follows keeps our status
    // column in sync, so this handler only ever records the invoice itself.
  });
}
