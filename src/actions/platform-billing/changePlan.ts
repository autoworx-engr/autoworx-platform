"use server";

import { db } from "@/lib/db";
import { changePlatformStripeSubscriptionPrice } from "@/lib/platform-billing/stripe/subscription";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";
import { revalidatePath } from "next/cache";

const LIVE_STATUSES = new Set(["TRIALING", "ACTIVE", "PAST_DUE"]);

/**
 * Switches an already-live Stripe subscription to a different plan in place
 * — no card re-entry, and Stripe prorates the difference. This is only for
 * subscriptions already on Stripe; a company with no live subscription (or
 * one still on the legacy Authorize.Net path) subscribes via checkout.ts
 * instead.
 */
export async function changePlatformPlan(companyId: number, newPlanId: string) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (
      !subscription?.stripeSubscriptionId ||
      !LIVE_STATUSES.has(subscription.status)
    ) {
      throw new Error(
        "No active Stripe subscription to change. Subscribe to a plan first.",
      );
    }

    const newPlan = await db.platformPlan.findFirst({
      where: {
        id: newPlanId,
        isActive: true,
        OR: [{ companyId: null }, { companyId }],
      },
    });
    if (!newPlan) throw new Error("Plan not found");
    if (!newPlan.stripePriceId) {
      throw new Error(
        "Plan is not yet synced to Stripe. Run the catalog sync first.",
      );
    }

    await changePlatformStripeSubscriptionPrice({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      newStripePriceId: newPlan.stripePriceId,
      newPlanId: newPlan.id,
    });

    // Optimistic local update — the customer.subscription.updated webhook
    // will also sync status/periods shortly after, but the plan/name switch
    // should reflect immediately in the UI rather than waiting on it.
    // Transactional so a crash mid-write can't leave planId pointing at the
    // new plan while the subscription item still shows the old one.
    await db.$transaction([
      db.platformSubscription.update({
        where: { companyId },
        data: { planId: newPlan.id },
      }),
      db.platformSubscriptionItem.deleteMany({
        where: { subscriptionId: subscription.id },
      }),
      db.platformSubscriptionItem.create({
        data: {
          subscriptionId: subscription.id,
          name: newPlan.name,
          price: newPlan.price,
          quantity: 1,
        },
      }),
    ]);

    revalidatePath("/dashboard/settings/billing");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to change platform plan:", error);
    return {
      success: false,
      message: error.message || "Failed to change plan",
    };
  }
}
