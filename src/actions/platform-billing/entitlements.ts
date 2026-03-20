"use server";

import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

export async function getEntitlements(companyId: number) {
  try {
    const entitlements = await getCompanyEntitlements(companyId);
    return { success: true, data: entitlements };
  } catch (error: any) {
    console.error("❌ Failed to resolve entitlements:", error);
    return { success: false, message: error.message };
  }
}
