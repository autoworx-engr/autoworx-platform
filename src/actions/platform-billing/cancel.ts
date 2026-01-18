"use server";

import { db } from "@/lib/db";
import { cancelPlatformARBSubscription } from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function cancelSubscription(companyId: number) {
  try {
    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (!subscription || !subscription.authNetSubscriptionId) {
      throw new Error("No active subscription found to cancel");
    }

    // 1. Cancel in Authorize.Net
    await cancelPlatformARBSubscription(subscription.authNetSubscriptionId);

    // 2. Update DB status
    // We set it to CANCELED.
    // Optimization: We could set a flag 'cancelAtPeriodEnd' if we wanted them to keep access until the end.
    // For now, let's keep it simple and just cancel.
    await db.platformSubscription.update({
      where: { companyId },
      data: {
        status: PlatformSubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      },
    });

    revalidatePath("/dashboard/settings/billing");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Cancellation failed:", error);
    return { success: false, message: error.message || "Failed to cancel subscription" };
  }
}
