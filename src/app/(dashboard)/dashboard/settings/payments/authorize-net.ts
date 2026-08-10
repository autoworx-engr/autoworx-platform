"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { verifyAuthorizeNetCredentials } from "@/actions/payment/authorizeNetPayment";

async function createAuthorizeNetWebhook(
  apiLoginId: string,
  transactionKey: string,
) {
  try {
    const rawUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/authorize-net/webhook`;
    let webhookUrl: string;
    try {
      const parsed = new URL(rawUrl);

      if (parsed.protocol !== "https:") {
        console.warn(
          "Authorize.Net webhook URL must be https; skipping creation for:",
          rawUrl,
        );
        return;
      }

      // Webhooks docs say only ., -, _, /, digits, and letters in URL path
      // Strip query/hash and normalize trailing slash
      parsed.search = "";
      parsed.hash = "";

      // Avoid trailing slash differences for comparison
      webhookUrl = parsed.toString().replace(/\/+$/, "");
    } catch (e) {
      console.warn(
        "Invalid AUTHORIZE_NET_WEBHOOK_URL/NEXT_PUBLIC_APP_URL:",
        rawUrl,
      );
      return;
    }

    const isProduction = process.env.AUTHORIZE_NET_ENVIRONMENT === "production";

    const host = isProduction
      ? "https://api.authorize.net"
      : "https://apitest.authorize.net";

    const auth = Buffer.from(`${apiLoginId}:${transactionKey}`).toString(
      "base64",
    );

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    };

    // Quick auth check against eventtypes endpoint so we can distinguish
    // auth problems from payload/URL problems.
    try {
      const evRes = await fetch(`${host}/rest/v1/eventtypes`, {
        method: "GET",
        headers,
      });

      if (!evRes.ok) {
        const t = await evRes.text();
        console.error(
          "Authorize.Net eventtypes request failed (auth/config issue?):",
          evRes.status,
          t,
        );
        // If auth fails here, don't attempt webhook creation.
        return;
      }
    } catch (e) {
      console.error("Authorize.Net eventtypes request error:", e);
      return;
    }

    console.log("Authorize.Net webhook target URL:", webhookUrl);

    // First, list existing webhooks to avoid creating duplicates
    let hasExisting = false;
    try {
      const listRes = await fetch(`${host}/rest/v1/webhooks`, {
        method: "GET",
        headers,
      });

      if (listRes.ok) {
        const existing = (await listRes.json()) as Array<{ url?: string }>;
        hasExisting =
          existing?.some(
            (w) => (w.url || "").replace(/\/+$/, "") === webhookUrl,
          ) ?? false;
      } else {
        const text = await listRes.text();
        console.warn(
          "Authorize.Net list webhooks failed:",
          listRes.status,
          text,
        );
      }
    } catch (err) {
      console.warn("Authorize.Net list webhooks error:", err);
    }

    if (hasExisting) {
      console.log(
        "Authorize.Net webhook already exists for URL, skipping creation:",
        webhookUrl,
      );
      return;
    }

    const body = {
      name: "Autoworx Payment Webhook",
      url: webhookUrl,
      eventTypes: ["net.authorize.payment.authcapture.created"],
      status: "active",
    };

    const res = await fetch(`${host}/rest/v1/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorText: string | undefined;
      let errorJson: any;
      try {
        errorText = await res.text();
        errorJson = JSON.parse(errorText);
      } catch {
        // ignore JSON parse error, fall back to raw text
      }

      console.error(
        "Authorize.Net create webhook failed:",
        res.status,
        errorJson || errorText,
      );
    } else {
      const json = await res.json();
      console.log("Authorize.Net webhook created:", json);
    }
  } catch (error) {
    console.error("Authorize.Net create webhook error:", error);
  }
}

export async function saveAuthorizeNetCredentials(
  apiLoginId: string,
  transactionKey: string,
  signatureKey: string,
) {
  try {
    const user = await getUser();

    if (!apiLoginId || !transactionKey || !signatureKey) {
      return {
        success: false,
        message:
          "API Login ID, Transaction Key, and Signature Key are required",
      };
    }

    // Verify credentials first
    const verification = await verifyAuthorizeNetCredentials(
      apiLoginId,
      transactionKey,
    );

    if (!verification.success) {
      return {
        success: false,
        message: verification.message || "Invalid credentials",
      };
    }

    await createAuthorizeNetWebhook(apiLoginId, transactionKey);

    // Save credentials
    await db.company.update({
      where: { id: user.companyId },
      data: {
        authorizeNetApiLoginId: apiLoginId,
        authorizeNetTransactionKey: transactionKey,
        authorizeNetSignatureKey: signatureKey,
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

export async function getAuthorizeNetStatus() {
  try {
    const user = await getUser();
    const companyId = user.companyId;

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        authorizeNetApiLoginId: true,
        authorizeNetTransactionKey: true,
        authorizeNetSignatureKey: true,
        paymentGateway: true,
      },
    });

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    const isConfigured = !!(
      company.authorizeNetApiLoginId &&
      company.authorizeNetTransactionKey &&
      company.authorizeNetSignatureKey
    );

    return {
      success: true,
      configured: isConfigured,
      paymentGateway: company.paymentGateway,
      hasApiLoginId: !!company.authorizeNetApiLoginId,
      hasSignatureKey: !!company.authorizeNetSignatureKey,
      apiLoginId: company.authorizeNetApiLoginId ?? "",
      transactionKey: company.authorizeNetTransactionKey ?? "",
      signatureKey: company.authorizeNetSignatureKey ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Failed to get Authorize.Net status",
    };
  }
}

export async function updateTipEnabled(enabled: boolean) {
  try {
    const user = await getUser();
    const companyId = user.companyId;

    await db.company.update({
      where: { id: companyId },
      data: { tipEnabled: enabled },
    });

    return { success: true, message: "Tip setting updated successfully" };
  } catch (error: any) {
    console.error("Update Tip Setting Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to update tip setting",
    };
  }
}

export async function updatePaymentGateway(
  gateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH",
) {
  try {
    const user = await getUser();
    const companyId = user.companyId;

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

export async function removeAuthorizeNetCredentials() {
  try {
    const user = await getUser();
    const companyId = user.companyId;

    await db.company.update({
      where: { id: companyId },
      data: {
        authorizeNetApiLoginId: null,
        authorizeNetTransactionKey: null,
        authorizeNetSignatureKey: null,
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
