"use server";

import { db } from "@/lib/db";
import { cancelPlatformARBSubscription } from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

export async function cancelSubscription(companyId: number) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (!subscription || !subscription.authNetSubscriptionId) {
      throw new Error("No active subscription found to cancel");
    }

    // 1. Cancel in Authorize.Net
    await cancelPlatformARBSubscription(subscription.authNetSubscriptionId);

    // 2. Update DB status
    // For now we treat cancellation as immediate from the
    // application perspective. If we later support "cancel at
    // period end" semantics, we can keep the ARB subscription
    // active until currentPeriodEnd and use `cancelAtPeriodEnd`.
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
