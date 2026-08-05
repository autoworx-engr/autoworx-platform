import { db } from "@/lib/db";
import { getBoss } from "@/lib/pgboss";
import { QUEUE_STRIPE } from "@/lib/queue-names";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[stripe/webhook] rejected: no stripe-signature header");
    return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

  let rawBody: string;
  let event: Stripe.Event;

  try {
    rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (error: any) {
    console.error(
      "[stripe/webhook] signature verification failed:",
      error?.message,
      "hasWebhookSecret:",
      Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    );
    return NextResponse.json(
      { error: `Signature verification failed: ${error?.message}` },
      { status: 400 },
    );
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json(
      { message: "Event type ignored" },
      { status: 200 },
    );
  }

  // Idempotency — skip if already fully processed
  const existing = await db.webhookEvent.findUnique({
    where: { eventId: event.id },
    select: { status: true },
  });

  if (existing?.status === "PROCESSED") {
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  // Extract companyId from metadata for per-company filtering
  let companyId: number | null = null;
  try {
    const paymentIntent = event.data.object as any;
    const paymentData = JSON.parse(paymentIntent.metadata?.paymentData ?? "{}");
    const parsed = Number(paymentData.companyId);
    if (Number.isInteger(parsed) && parsed > 0) companyId = parsed;
  } catch {}

  // Persist raw event before enqueuing — never lose the payload
  try {
    await db.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        gateway: "STRIPE",
        companyId,
        payload: JSON.parse(rawBody),
        status: "PENDING",
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    const boss = getBoss();
    await boss.send(QUEUE_STRIPE, { eventId: event.id });
    console.log(
      "[stripe/webhook] enqueued eventId:",
      event.id,
      "companyId:",
      companyId,
    );
  } catch (err) {
    console.error(
      "[stripe/webhook] Failed to persist/enqueue eventId:",
      event.id,
      err,
    );
  }

  // Always return 200 — non-200 causes Stripe to retry and eventually disable the webhook endpoint
  return NextResponse.json({ message: "Webhook queued" }, { status: 200 });
}
