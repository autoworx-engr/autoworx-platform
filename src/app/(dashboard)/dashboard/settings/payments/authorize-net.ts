"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { verifyAuthorizeNetCredentials } from "@/actions/payment/authorizeNetPayment";

export async function saveAuthorizeNetCredentials(
  apiLoginId: string,
  transactionKey: string
) {
  try {
    const user = await getUser();

    if (!apiLoginId || !transactionKey) {
      return {
        success: false,
        message: "API Login ID and Transaction Key are required",
      };
    }

    // Verify credentials first
    const verification = await verifyAuthorizeNetCredentials(
      apiLoginId,
      transactionKey
    );

    if (!verification.success) {
      return {
        success: false,
        message: verification.message || "Invalid credentials",
      };
    }

    // Save credentials
    await db.company.update({
      where: { id: user.companyId },
      data: {
        authorizeNetApiLoginId: apiLoginId,
        authorizeNetTransactionKey: transactionKey,
      },
    });

    return { success: true, message: "Credentials saved successfully" };
  } catch (error: any) {
    console.error("Save Authorize.Net Credentials Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to save credentials",
    };
  }
}

export async function getAuthorizeNetStatus(companyId: number) {
  try {
    if (!companyId) throw new Error("Company ID not found");

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        authorizeNetApiLoginId: true,
        authorizeNetTransactionKey: true,
        paymentGateway: true,
      },
    });

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    const isConfigured = !!(
      company.authorizeNetApiLoginId && company.authorizeNetTransactionKey
    );

    return {
      success: true,
      configured: isConfigured,
      paymentGateway: company.paymentGateway,
      hasApiLoginId: !!company.authorizeNetApiLoginId,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Failed to get Authorize.Net status",
    };
  }
}

export async function updatePaymentGateway(
  companyId: number,
  gateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH"
) {
  try {
    if (!companyId) throw new Error("Company ID not found");

    await db.company.update({
      where: { id: companyId },
      data: { paymentGateway: gateway },
    });

    return { success: true, message: "Payment gateway updated successfully" };
  } catch (error: any) {
    console.error("Update Payment Gateway Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to update payment gateway",
    };
  }
}

export async function removeAuthorizeNetCredentials(companyId: number) {
  try {
    if (!companyId) throw new Error("Company ID not found");

    await db.company.update({
      where: { id: companyId },
      data: {
        authorizeNetApiLoginId: null,
        authorizeNetTransactionKey: null,
      },
    });

    return { success: true, message: "Credentials removed successfully" };
  } catch (error: any) {
    console.error("Remove Authorize.Net Credentials Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to remove credentials",
    };
  }
}
