"use server";

import { createPlatformCheckoutSession } from "@/lib/platform-billing/stripe/checkout";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

type CreatePlatformCheckoutInput = {
  companyId: number;
  planId: string;
  email: string;
};

export async function createPlatformCheckout({
  companyId,
  planId,
  email,
}: CreatePlatformCheckoutInput) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");

    const { url } = await createPlatformCheckoutSession({
      companyId,
      planId,
      email,
      successUrl: `${baseUrl}/dashboard/settings/billing?checkout=success`,
      cancelUrl: `${baseUrl}/dashboard/settings/billing?checkout=cancelled`,
    });

    return { success: true, url };
  } catch (error: any) {
    console.error("❌ Failed to create platform checkout session:", error);
    return {
      success: false,
      message: error.message || "Failed to start checkout",
    };
  }
}
