"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getPaymentGatewayInfo(companyId?: number) {
  try {
    const resolvedId = companyId ?? (await getCompanyId());

    const company = await db.company.findUnique({
      where: { id: resolvedId },
      select: {
        stripeAccountId: true,
        authorizeNetApiLoginId: true,
        authorizeNetTransactionKey: true,
        paymentGateway: true,
        tipEnabled: true,
      },
    });

    if (!company) {
      return {
        success: false,
        message: "Company not found",
        hasStripe: false,
        hasAuthorizeNet: false,
        paymentGateway: null as string | null,
      };
    }

    const hasStripe = !!company.stripeAccountId;
    const hasAuthorizeNet = !!(
      company.authorizeNetApiLoginId && company.authorizeNetTransactionKey
    );

    return {
      success: true,
      hasStripe,
      hasAuthorizeNet,
      paymentGateway: company.paymentGateway || "STRIPE",
      tipEnabled: company.tipEnabled ?? false,
    };
  } catch (error: any) {
    console.error("Get Payment Gateway Info Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to get payment gateway info",
      hasStripe: false,
      hasAuthorizeNet: false,
      paymentGateway: null,
    };
  }
}
