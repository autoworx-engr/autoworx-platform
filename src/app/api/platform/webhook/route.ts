import { db } from "@/lib/db";
import { getPlatformTransactionDetails } from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Authorize.Net Webhook Handler for Platform Billing
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-anet-signature");
    const rawBody = Buffer.from(await req.arrayBuffer());
    const bodyText = rawBody.toString("utf8");

    const shouldVerify = !!process.env.PLATFORM_AUTHNET_SIGNATURE_KEY;
    // const shouldVerify =
    //   process.env.NODE_ENV === "production" &&
    //   !!process.env.PLATFORM_AUTHNET_SIGNATURE_KEY;

    if (shouldVerify && !verifySignature(rawBody, signature)) {
      console.warn("❌ Invalid Authorize.Net platform webhook signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(bodyText);

    switch (event.eventType) {
      case "net.authorize.customer.subscription.created":
        console.log("Subscription created successfully:", event.payload.id);
        break;
      // Recurring subscription charges come through as payment events, not a
      // dedicated "subscription.payment" event. We listen for successful
      // auth+capture payments that are tied to a subscription.
      case "net.authorize.payment.authcapture.created":
        await handleSubscriptionPayment(event.payload);
        break;
      case "net.authorize.customer.subscription.cancelled":
      case "net.authorize.customer.subscription.terminated":
        await handleSubscriptionCancelled(event.payload);
        break;
      case "net.authorize.customer.subscription.suspended":
      case "net.authorize.customer.subscription.failed":
        await handleSubscriptionSuspended(event.payload);
        break;
      default:
        console.log("Unhandled event type:", event.eventType);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("❌ Platform Webhook Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

async function handleSubscriptionPayment(payload: any) {
  const status = payload.responseCode === 1 ? "PAID" : "FAILED";
  const authNetTransId = payload.id || payload.transactionId || payload.transId;

  if (!authNetTransId) {
    console.error("No transaction ID found in payment payload:", payload);
    return;
  }

  // For payment webhooks, subscription info (for ARB) is nested under
  // payload.subscription. If not present, fetch transaction details
  // to resolve the subscription id.
  let subscriptionId =
    payload.subscription?.id ||
    payload.subscription?.subscriptionId ||
    payload.subscriptionId;

  if (!subscriptionId) {
    try {
      const transaction = await getPlatformTransactionDetails(
        authNetTransId.toString(),
      );
      subscriptionId =
        transaction?.subscription?.id ||
        transaction?.subscriptionId ||
        transaction?.subscription?.subscriptionId;
    } catch (error) {
      console.error(
        "Failed to resolve subscription from transaction details:",
        error,
      );
    }
  }

  if (!subscriptionId) {
    console.log(
      "Skipping payment webhook without subscription reference:",
      payload,
    );
    return;
  }

  const subscription = await db.platformSubscription.findUnique({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    include: { billingCustomer: true, plan: true },
  });

  if (!subscription) {
    console.error("Subscription not found for ID:", subscriptionId);
    return;
  }

  // 1. Check if we've already processed this transaction
  const existingInvoice = await db.platformInvoice.findFirst({
    where: { authNetTransId: authNetTransId.toString() },
  });

  if (existingInvoice) {
    console.log(
      "Transaction already processed, skipping invoice creation:",
      authNetTransId,
    );
    return;
  }

  // 2. Create local invoice and payment record
  const amount =
    payload.authAmount ??
    payload.settleAmount ??
    payload.amount ??
    subscription.plan.price;

  await db.$transaction(async (tx) => {
    const invoice = await tx.platformInvoice.create({
      data: {
        billingCustomerId: subscription.billingCustomerId,
        subscriptionId: subscription.id,
        amount,
        status: status,
        authNetTransId: authNetTransId.toString(),
      },
    });

    if (status === "PAID") {
      await tx.platformPayment.create({
        data: {
          platformInvoiceId: invoice.id,
          amount,
          status: "SUCCESS",
          authNetTransId: authNetTransId.toString(),
        },
      });

      // 3. Update subscription period
      // Bump by the correct interval based on the plan (1 month or 12 months for yearly)
      const currentEnd = subscription.currentPeriodEnd || new Date();
      const nextPeriodEnd = new Date(currentEnd);
      const intervalMonths = subscription.plan.interval === "YEARLY" ? 12 : 1;
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + intervalMonths);

      await tx.platformSubscription.update({
        where: { id: subscription.id },
        data: {
          status: PlatformSubscriptionStatus.ACTIVE,
          currentPeriodEnd: nextPeriodEnd,
          currentPeriodStart: currentEnd,
        },
      });
    } else {
      await tx.platformSubscription.update({
        where: { id: subscription.id },
        data: { status: PlatformSubscriptionStatus.PAST_DUE },
      });
      // TODO: Send dunning email
    }
  });
}

async function handleSubscriptionCancelled(payload: any) {
  // Subscription webhooks use payload.id as the subscription id
  const subscriptionId = payload.id;
  if (!subscriptionId) {
    console.error("Subscription cancelled event missing id:", payload);
    return;
  }

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: {
      status: PlatformSubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
      authNetSubscriptionId: null,
    },
  });
}

async function handleSubscriptionSuspended(payload: any) {
  // For suspended/failed/expired style events, payload.id is also
  // the Authorize.Net subscription id.
  const subscriptionId = payload.id;
  if (!subscriptionId) {
    console.error("Subscription status event missing id:", payload);
    return;
  }

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: { status: PlatformSubscriptionStatus.PAST_DUE },
  });
}

/**
 * Signature Verification
 */
function verifySignature(body: Buffer, signature: string | null): boolean {
  if (!signature) return false;
  const signatureKey = (
    process.env.PLATFORM_AUTHNET_SIGNATURE_KEY || ""
  ).trim();
  if (!signatureKey) return false;

  const received = signature.trim().replace(/^sha512=/i, "");
  if (!/^[a-fA-F0-9]{128}$/.test(received)) return false;

  const matches = (computedHex: string, headerHex: string): boolean => {
    const computedBytes = Buffer.from(computedHex, "hex");
    const headerBytes = Buffer.from(headerHex, "hex");
    if (computedBytes.length !== headerBytes.length) return false;
    return crypto.timingSafeEqual(computedBytes, headerBytes);
  };

  const utf8KeyHash = crypto
    .createHmac("sha512", signatureKey)
    .update(body)
    .digest("hex");

  if (matches(utf8KeyHash, received)) {
    return true;
  }

  if (/^[a-fA-F0-9]{128}$/.test(signatureKey)) {
    const hexKeyHash = crypto
      .createHmac("sha512", Buffer.from(signatureKey, "hex"))
      .update(body)
      .digest("hex");

    if (matches(hexKeyHash, received)) {
      return true;
    }
  }

  return false;
}
