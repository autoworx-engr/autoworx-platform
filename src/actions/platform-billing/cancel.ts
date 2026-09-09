"use server";

import { db } from "@/lib/db";
import { setPlatformStripeCancelAtPeriodEnd } from "@/lib/platform-billing/stripe/subscription";
import { revalidatePath } from "next/cache";
import {
  assertBillingAccess,
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

/**
 * Cancels at period end, reversible via resumePlatformSubscription — access
 * continues until currentPeriodEnd, matching what the customer already paid
 * for. The status flip to CANCELED comes from the
 * customer.subscription.deleted webhook when the period actually ends.
 */
export async function cancelSubscription(companyId: number) {
  try {
    const session = await requireBillingSession();
    await assertBillingAccess();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error("No active subscription found to cancel");
    }

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
    await assertBillingAccess();
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
