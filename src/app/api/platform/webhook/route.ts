import { db } from "@/lib/db";
import { getBoss } from "@/lib/pgboss";
import { QUEUE_PLATFORM_BILLING } from "@/lib/queue-names";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HANDLED_EVENTS = new Set([
  "net.authorize.payment.authcapture.created",
  "net.authorize.customer.subscription.created",
  "net.authorize.customer.subscription.cancelled",
  "net.authorize.customer.subscription.terminated",
  "net.authorize.customer.subscription.suspended",
  "net.authorize.customer.subscription.failed",
]);

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const bodyText = rawBody.toString("utf8");
  const signature = req.headers.get("x-anet-signature");

  if (
    !!process.env.PLATFORM_AUTHNET_SIGNATURE_KEY &&
    !verifySignature(rawBody, signature)
  ) {
    console.warn("Invalid signature for Authorize.Net webhook");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(bodyText);
  } catch {
    console.error("[platform/webhook] invalid JSON body");
    return new NextResponse("OK", { status: 200 });
  }

  if (!HANDLED_EVENTS.has(event.eventType)) {
    return new NextResponse("OK", { status: 200 });
  }

  // notificationId is unique per delivery — use as idempotency key
  const eventId = event.notificationId || event.payload?.id;
  if (!eventId) {
    console.error("[platform/webhook] missing event ID", {
      eventType: event.eventType,
    });
    return new NextResponse("OK", { status: 200 });
  }

  const existing = await db.webhookEvent.findUnique({
    where: { eventId },
    select: { status: true },
  });

  if (existing?.status === "PROCESSED") {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    await db.webhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        gateway: "PLATFORM_AUTHORIZE_NET",
        companyId: null,
        payload: event,
        status: "PENDING",
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    const boss = getBoss();
    await boss.send(QUEUE_PLATFORM_BILLING, { eventId });
  } catch (err) {
    console.error(
      "[platform/webhook] Failed to persist/enqueue eventId:",
      eventId,
      err,
    );
  }

  // Always return 200 — non-200 causes Authorize.net to retry then DEACTIVATE the webhook
  return new NextResponse("OK", { status: 200 });
}

function verifySignature(body: Buffer, signature: string | null): boolean {
  if (!signature) return false;
  const signatureKey = (
    process.env.PLATFORM_AUTHNET_SIGNATURE_KEY || ""
  ).trim();
  if (!signatureKey) return false;

  const received = signature
    .trim()
    .replace(/^sha512=/i, "")
    .toUpperCase();
  if (!/^[a-fA-F0-9]{128}$/.test(received)) return false;

  const compute = (key: Buffer | string) =>
    crypto.createHmac("sha512", key).update(body).digest("hex").toUpperCase();

  const safeEqual = (a: string, b: string) => {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  };

  if (safeEqual(compute(signatureKey), received)) return true;

  if (/^[a-fA-F0-9]{128}$/.test(signatureKey)) {
    if (safeEqual(compute(Buffer.from(signatureKey, "hex")), received))
      return true;
  }

  return false;
}
