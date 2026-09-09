import "server-only";
import { db } from "@/lib/db";
import { syncPlatformPlanToStripe } from "./catalog";
import { getPlatformStripeClient } from "./client";

const LIVE_STRIPE_STATUSES = new Set(["trialing", "active", "past_due"]);

/**
 * Returns the company's Stripe customer, creating both the Stripe Customer
 * and the local PlatformBillingCustomer row on first use.
 */
export async function ensurePlatformStripeCustomer(
  companyId: number,
  email: string,
) {
  const stripe = getPlatformStripeClient();
  const billingCustomer = await db.platformBillingCustomer.findUnique({
    where: { companyId },
  });

  // A stored id can point at a customer this key can't see — deleted in the
  // dashboard, or the account switched underneath us (test -> live at
  // go-live, or a restored database). Verify before reusing, and fall
  // through to creating a fresh one instead of failing checkout with an
  // opaque Stripe error.
  if (billingCustomer?.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(
        billingCustomer.stripeCustomerId,
      );
      if (!existing.deleted) {
        return {
          billingCustomer,
          stripeCustomerId: billingCustomer.stripeCustomerId,
        };
      }
    } catch (err: any) {
      if (err?.code !== "resource_missing") throw err;
    }
    console.error(
      `[platform-stripe] stored Stripe customer ${billingCustomer.stripeCustomerId} for company ${companyId} is unusable — creating a replacement`,
    );
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { companyId: String(companyId) },
  });

  const updated = await db.platformBillingCustomer.upsert({
    where: { companyId },
    update: { stripeCustomerId: customer.id, email },
    create: { companyId, stripeCustomerId: customer.id, email },
  });

  // Cards are mirrored per company, not per Stripe customer, so the rows left
  // behind describe the customer we just abandoned — including whichever one
  // was flagged default. Leaving them would show the owner a card on file that
  // no longer exists anywhere. The replacement customer's card gets mirrored
  // by payment_method.attached during Checkout.
  if (
    billingCustomer?.stripeCustomerId &&
    billingCustomer.stripeCustomerId !== customer.id
  ) {
    await db.platformPaymentMethod.deleteMany({
      where: { billingCustomerId: updated.id },
    });
  }

  return { billingCustomer: updated, stripeCustomerId: customer.id };
}

export async function createPlatformCheckoutSession(params: {
  companyId: number;
  planId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { companyId, planId, email, successUrl, cancelUrl } = params;
  const stripe = getPlatformStripeClient();

  const plan = await db.platformPlan.findFirst({
    where: {
      id: planId,
      isActive: true,
      OR: [{ companyId: null }, { companyId }],
    },
  });
  if (!plan) throw new Error("Plan not found");

  // The plan-create/update routes sync to Stripe best-effort and swallow
  // failures, so one transient Stripe error would otherwise leave a plan
  // permanently unbuyable. Sync on demand instead of refusing — it is
  // idempotent, and a no-op once the price exists.
  let stripePriceId = plan.stripePriceId;
  if (!stripePriceId) {
    console.error(
      `[platform-stripe] plan ${plan.id} ("${plan.name}") had no Stripe price at checkout — syncing on demand`,
    );
    const synced = await syncPlatformPlanToStripe(plan.id);
    stripePriceId = synced.priceId;
  }
  if (!stripePriceId) {
    throw new Error(
      "We couldn't start checkout for this plan. Please try again in a moment.",
    );
  }

  const { stripeCustomerId, billingCustomer } =
    await ensurePlatformStripeCustomer(companyId, email);

  // Plan changes on an already-live subscription go through changePlan
  // (in-app subscriptions.update + proration) — Checkout is for a fresh
  // subscribe only. Checked against Stripe directly, not our local DB
  // mirror: the mirror is only as fresh as the last processed webhook,
  // which lags the actual Stripe write by however long the async
  // webhook->queue->worker pipeline takes (seconds, sometimes longer under
  // retry). A second checkout started inside that window would read stale
  // local state and create a second live subscription instead of updating
  // the first — this check closes that race by asking Stripe itself.
  // limit: 100 (Stripe's max) rather than the 10-item default — a customer
  // who has resubscribed many times over the years could otherwise push
  // their one live subscription past the first page, since old canceled
  // ones from prior cycles stay in this list too.
  const existingStripeSubs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  });
  const liveStripeSub = existingStripeSubs.data.find((s) =>
    LIVE_STRIPE_STATUSES.has(s.status),
  );
  if (liveStripeSub) {
    throw new Error(
      "This company already has an active subscription. Use plan change instead of checkout.",
    );
  }

  const trialEligible =
    plan.trialLengthDays > 0 && !billingCustomer.trialConsumedAt;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { companyId: String(companyId), planId: plan.id },
    subscription_data: {
      metadata: { companyId: String(companyId), planId: plan.id },
      ...(trialEligible
        ? {
            trial_period_days: plan.trialLengthDays,
            trial_settings: {
              end_behavior: { missing_payment_method: "cancel" },
            },
          }
        : {}),
    },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return { url: session.url };
}
