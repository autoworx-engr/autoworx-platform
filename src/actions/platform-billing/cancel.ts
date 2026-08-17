"use server";

import { db } from "@/lib/db";
import { cancelPlatformARBSubscription } from "@/lib/platform-billing/authorize-net";
import { setPlatformStripeCancelAtPeriodEnd } from "@/lib/platform-billing/stripe/subscription";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

/**
 * Cancels a subscription. Stripe subscriptions cancel at period end
 * (reversible via resumePlatformSubscription) — access continues until
 * currentPeriodEnd, matching what the customer already paid for. Legacy
 * Authorize.Net subscriptions keep the old immediate-revoke behavior; ARB has
 * no built-in "cancel at period end" and this path is being phased out.
 */
export async function cancelSubscription(companyId: number) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (subscription?.stripeSubscriptionId) {
      await setPlatformStripeCancelAtPeriodEnd(
        subscription.stripeSubscriptionId,
        true,
      );
      await db.platformSubscription.update({
        where: { companyId },
        data: { cancelAtPeriodEnd: true },
      });
      revalidatePath("/dashboard/settings/billing");
      return { success: true };
    }

    if (!subscription?.authNetSubscriptionId) {
      throw new Error("No active subscription found to cancel");
    }

    await cancelPlatformARBSubscription(subscription.authNetSubscriptionId);

    await db.platformSubscription.update({
      where: { companyId },
      data: {
        status: PlatformSubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
        // Clear the remote subscription id so future flows
        // don't keep trying to cancel or update a non-existent ARB.
        authNetSubscriptionId: null,
      },
    });

    revalidatePath("/dashboard/settings/billing");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Cancellation failed:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel subscription",
    };
  }
}

/** Undo a pending cancel-at-period-end before the period actually ends. */
export async function resumePlatformSubscription(companyId: number) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error("No Stripe subscription to resume");
    }

    await setPlatformStripeCancelAtPeriodEnd(
      subscription.stripeSubscriptionId,
      false,
    );
    await db.platformSubscription.update({
      where: { companyId },
      data: { cancelAtPeriodEnd: false },
    });

    revalidatePath("/dashboard/settings/billing");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to resume subscription:", error);
    return {
      success: false,
      message: error.message || "Failed to resume subscription",
    };
  }
}
