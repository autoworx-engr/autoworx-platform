"use server";

import { db } from "@/lib/db";
import { createPlatformBillingPortalSession } from "@/lib/platform-billing/stripe/portal";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

export async function createPlatformBillingPortal(companyId: number) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const billingCustomer = await db.platformBillingCustomer.findUnique({
      where: { companyId },
    });

    if (!billingCustomer?.stripeCustomerId) {
      throw new Error("No Stripe billing customer found for this company");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");

    const { url } = await createPlatformBillingPortalSession({
      stripeCustomerId: billingCustomer.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/settings/billing`,
    });

    return { success: true, url };
  } catch (error: any) {
    console.error("❌ Failed to create billing portal session:", error);
    return {
      success: false,
      message: error.message || "Failed to open billing portal",
    };
  }
}
