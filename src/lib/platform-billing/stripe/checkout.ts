import "server-only";
import { db } from "@/lib/db";
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

  if (billingCustomer?.stripeCustomerId) {
    return {
      billingCustomer,
      stripeCustomerId: billingCustomer.stripeCustomerId,
    };
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
  if (!plan.stripePriceId) {
    throw new Error(
      "Plan is not yet synced to Stripe. Run the catalog sync first.",
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
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
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
