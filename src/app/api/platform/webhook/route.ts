import { db } from "@/lib/db";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Authorize.Net Webhook Handler for Platform Billing
 */
export async function POST(req: NextRequest) {
  try {

    const signature = req.headers.get("x-anet-signature");
    const bodyText = await req.text();
    const event = JSON.parse(bodyText);
console.log("🔔 Authorize.net Platform Billing Webhook Received",event);
    // TODO: Verify Signature using PLATFORM_AUTHNET_SIGNATURE_KEY
    // if (!verifySignature(bodyText, signature)) {
    //   return new NextResponse("Invalid signature", { status: 401 });
    // }

    console.log("🔔 Platform Billing Webhook Received:", event.eventType);

    switch (event.eventType) {
      case "net.authorize.customer.subscription.created":
        console.log("Subscription created successfully:", event.payload.id);
        break;
      case "net.authorize.customer.subscription.payment":
        await handleSubscriptionPayment(event.payload);
        break;
      case "net.authorize.customer.subscription.cancelled":
      case "net.authorize.customer.subscription.terminated":
        await handleSubscriptionCancelled(event.payload);
        break;
      case "net.authorize.customer.subscription.suspended":
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
  const subscriptionId = payload.subscriptionId || payload.id;
  if (!subscriptionId) {
    console.error("No subscription ID found in payload:", payload);
    return;
  }

  const status = payload.responseCode === 1 ? "PAID" : "FAILED";
  const authNetTransId = payload.transactionId;

  const subscription = await db.platformSubscription.findUnique({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    include: { billingCustomer: true },
  });

  if (!subscription) {
    console.error("Subscription not found for ID:", subscriptionId);
    return;
  }

  // Create local invoice and payment record
  const invoice = await db.platformInvoice.create({
    data: {
      billingCustomerId: subscription.billingCustomerId,
      subscriptionId: subscription.id,
      amount: payload.amount,
      status: status,
      authNetTransId: authNetTransId.toString(),
    },
  });

  if (status === "PAID") {
    await db.platformPayment.create({
      data: {
        platformInvoiceId: invoice.id,
        amount: payload.amount,
        status: "SUCCESS",
        authNetTransId: authNetTransId.toString(),
      },
    });

    // Update subscription period
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await db.platformSubscription.update({
      where: { id: subscription.id },
      data: {
        status: PlatformSubscriptionStatus.ACTIVE,
        currentPeriodEnd: nextPeriodEnd,
      },
    });
  } else {
    await db.platformSubscription.update({
      where: { id: subscription.id },
      data: { status: PlatformSubscriptionStatus.PAST_DUE },
    });
    // TODO: Send dunning email
  }
}

async function handleSubscriptionCancelled(payload: any) {
  const subscriptionId = payload.subscriptionId || payload.id;
  if (!subscriptionId) return;

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: { status: PlatformSubscriptionStatus.CANCELED },
  });
}

async function handleSubscriptionSuspended(payload: any) {
  const subscriptionId = payload.subscriptionId || payload.id;
  if (!subscriptionId) return;

  await db.platformSubscription.updateMany({
    where: { authNetSubscriptionId: subscriptionId.toString() },
    data: { status: PlatformSubscriptionStatus.PAST_DUE },
  });
}

/**
 * Signature Verification
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const key = process.env.PLATFORM_AUTHNET_SIGNATURE_KEY || "";
  const hash = crypto
    .createHmac("sha512", key)
    .update(body)
    .digest("hex")
    .toUpperCase();

  return `sha512=${hash}` === signature.toUpperCase();
}
