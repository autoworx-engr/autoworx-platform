"use server";

import { db } from "@/lib/db";
import { syncPlatformPlanToStripe } from "@/lib/platform-billing/stripe/catalog";
import {
  changePlatformStripeSubscriptionPrice,
  previewPlatformPlanChange as previewStripePlanChange,
} from "@/lib/platform-billing/stripe/subscription";
import {
  assertBillingAccess,
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";
import { revalidatePath } from "next/cache";

const LIVE_STATUSES = new Set(["TRIALING", "ACTIVE", "PAST_DUE"]);

/**
 * Switches an already-live Stripe subscription to a different plan in place
 * — no card re-entry, and Stripe prorates the difference. A company with no
 * live subscription subscribes via checkout.ts instead.
 */
export async function changePlatformPlan(companyId: number, newPlanId: string) {
  try {
    const session = await requireBillingSession();
    await assertBillingAccess();
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

    // Same on-demand sync as checkout — see stripe/checkout.ts.
    let newStripePriceId = newPlan.stripePriceId;
    if (!newStripePriceId) {
      console.error(
        `[platform-stripe] plan ${newPlan.id} ("${newPlan.name}") had no Stripe price at plan change — syncing on demand`,
      );
      newStripePriceId = (await syncPlatformPlanToStripe(newPlan.id)).priceId;
    }
    if (!newStripePriceId) {
      throw new Error(
        "We couldn't switch your plan just now. Please try again in a moment.",
      );
    }

    await changePlatformStripeSubscriptionPrice({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      newStripePriceId,
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

/**
 * Priced preview for the confirm step. Prorations land on the next invoice, so
 * without this the owner sees no charge today and an unexplained larger bill
 * next cycle.
 */
export async function previewPlatformPlanChange(
  companyId: number,
  newPlanId: string,
) {
  try {
    const session = await requireBillingSession();
    await assertBillingAccess();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });
    if (
      !subscription?.stripeSubscriptionId ||
      !LIVE_STATUSES.has(subscription.status)
    ) {
      throw new Error("No active subscription to change");
    }

    const newPlan = await db.platformPlan.findFirst({
      where: {
        id: newPlanId,
        isActive: true,
        OR: [{ companyId: null }, { companyId }],
      },
    });
    if (!newPlan) throw new Error("Plan not found");

    let priceId = newPlan.stripePriceId;
    if (!priceId)
      priceId = (await syncPlatformPlanToStripe(newPlan.id)).priceId;
    if (!priceId) throw new Error("Plan is not available right now");

    const preview = await previewStripePlanChange({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      newStripePriceId: priceId,
    });

    return {
      success: true,
      data: {
        ...preview,
        planName: newPlan.name,
        recurringAmount: Number(newPlan.price),
        interval: newPlan.interval,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to preview plan change:", error);
    return {
      success: false,
      message: error.message || "Failed to preview plan change",
    };
  }
}
