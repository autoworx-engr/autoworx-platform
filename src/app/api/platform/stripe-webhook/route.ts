import { db } from "@/lib/db";
import { getBoss } from "@/lib/pgboss";
import { getPlatformStripeClient } from "@/lib/platform-billing/stripe/client";
import { QUEUE_PLATFORM_BILLING } from "@/lib/queue-names";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "payment_method.attached",
  "payment_method.detached",
]);

export async function POST(req: NextRequest) {
  // Stripe signature verification requires the exact raw body bytes —
  // req.text() gives that as long as nothing upstream (middleware, body
  // parsers) has touched the request first.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.PLATFORM_STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error(
      "[platform/stripe-webhook] missing signature or webhook secret",
    );
    return new NextResponse("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getPlatformStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(
      "[platform/stripe-webhook] signature verification failed:",
      err,
    );
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    const existing = await db.webhookEvent.findUnique({
      where: { eventId: event.id },
      select: { status: true },
    });

    if (existing?.status === "PROCESSED") {
      return new NextResponse("OK", { status: 200 });
    }

    await db.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        gateway: "PLATFORM_STRIPE",
        companyId: null,
        payload: event as any,
        status: "PENDING",
      },
      update: {
        payload: event as any,
        attempts: { increment: 1 },
      },
    });

    const boss = getBoss();
    await boss.send(QUEUE_PLATFORM_BILLING, { eventId: event.id });
  } catch (err) {
    console.error(
      "[platform/stripe-webhook] failed to persist/enqueue event:",
      event.id,
      err,
    );
    // Unlike the Authorize.Net webhook, Stripe retries on non-2xx — return
    // 500 so Stripe redelivers an event we failed to durably record.
    return new NextResponse("Internal error", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
