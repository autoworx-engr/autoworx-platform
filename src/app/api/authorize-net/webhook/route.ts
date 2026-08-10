import { db } from "@/lib/db";
import { getBoss } from "@/lib/pgboss";
import { QUEUE_AUTHORIZE_NET } from "@/lib/queue-names";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HANDLED_EVENTS = new Set([
  "net.authorize.payment.authcapture.created",
  "net.authorize.payment.authorization.created",
]);

function verifySignature(
  rawBody: string,
  header: string | null,
  signatureKey: string,
): boolean {
  if (!header) return false;

  const expected = createHmac("sha512", signatureKey)
    .update(rawBody)
    .digest("hex")
    .toUpperCase();

  const received = header.startsWith("sha512=")
    ? header.slice(7).toUpperCase()
    : header.toUpperCase();

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

// Extract companyId from payload before any DB writes so we can fetch the
// per-company signature key for validation.
async function extractCompanyId(payload: any): Promise<number | null> {
  const invoiceNumber = payload?.invoiceNumber as string | undefined;
  if (!invoiceNumber) return null;

  const rawInvoiceNumber = invoiceNumber.replace(/-TC?\d[\d.]*$/, "");

  // Gift card types encode companyId in base36 within the paymentRef — no DB needed
  const gcPrefixes = ["VSGCR-", "VSGCP-", "VSGC-"];
  for (const prefix of gcPrefixes) {
    if (rawInvoiceNumber.startsWith(prefix)) {
      const ref = rawInvoiceNumber.slice(prefix.length).trim().toUpperCase();
      if (ref[0] === "P" || ref[0] === "R") {
        const companyId = parseInt(ref.slice(1, 5), 36);
        if (Number.isInteger(companyId) && companyId > 0) return companyId;
      }
      return null;
    }
  }

  // Virtual shop deposit: shopBookingId encoded after prefix
  if (rawInvoiceNumber.startsWith("VSB-DEP-")) {
    const shopBookingId = Number(rawInvoiceNumber.slice(8));
    if (!shopBookingId) return null;
    const booking = await db.shopBooking.findUnique({
      where: { id: shopBookingId },
      select: { shop: { select: { companyId: true } } },
    });
    return booking?.shop?.companyId ?? null;
  }

  // Invoice or deposit: targetId is the invoiceId
  if (
    rawInvoiceNumber.startsWith("INV-") ||
    rawInvoiceNumber.startsWith("DEP-")
  ) {
    const invoiceId = rawInvoiceNumber.slice(4);
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { companyId: true },
    });
    return invoice?.companyId ?? null;
  }

  // Statement
  if (rawInvoiceNumber.startsWith("STM-")) {
    const statementId = rawInvoiceNumber.slice(4);
    const statement = await db.fleetStatement.findUnique({
      where: { id: statementId },
      include: {
        Fleet: { include: { client: { select: { companyId: true } } } },
      },
    });
    return statement?.Fleet?.client?.companyId ?? null;
  }

  // Fallback: treat rawInvoiceNumber as invoiceId directly
  const invoice = await db.invoice.findUnique({
    where: { id: rawInvoiceNumber },
    select: { companyId: true },
  });
  return invoice?.companyId ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-anet-signature");

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventType;
  const transactionId = body.payload?.id as string | undefined;

  if (!HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json(
      { message: "Event type ignored" },
      { status: 200 },
    );
  }

  if (!transactionId) {
    return NextResponse.json({ message: "No transactionId" }, { status: 200 });
  }

  // Fetch per-company signature key and validate
  let companyId: number | null;
  try {
    companyId = await extractCompanyId(body.payload);
  } catch (err) {
    console.error(
      "[authorize-net/webhook] extractCompanyId threw for transactionId:",
      transactionId,
      err,
    );
    return NextResponse.json({ message: "Acknowledged" }, { status: 200 });
  }

  if (!companyId) {
    console.error(
      "[authorize-net/webhook] Cannot identify company for transactionId:",
      transactionId,
      JSON.stringify(body.payload),
    );
    return NextResponse.json({ message: "Acknowledged" }, { status: 200 });
  }

  let signatureKey: string | null | undefined;
  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { authorizeNetSignatureKey: true },
    });
    signatureKey = company?.authorizeNetSignatureKey;
  } catch (err) {
    console.error(
      "[authorize-net/webhook] company lookup failed for transactionId:",
      transactionId,
      companyId,
      err,
    );
    return NextResponse.json({ message: "Acknowledged" }, { status: 200 });
  }

  if (
    !signatureKey ||
    !verifySignature(rawBody, signatureHeader, signatureKey)
  ) {
    console.error("[authorize-net/webhook] signature rejected:", {
      transactionId,
      companyId,
      hasSignatureKey: Boolean(signatureKey),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotency — skip if already fully processed
  try {
    const existing = await db.webhookEvent.findUnique({
      where: { eventId: transactionId },
      select: { status: true },
    });

    if (existing?.status === "PROCESSED") {
      return NextResponse.json(
        { message: "Already processed" },
        { status: 200 },
      );
    }
  } catch (err) {
    console.error(
      "[authorize-net/webhook] idempotency check failed:",
      transactionId,
      err,
    );
  }

  // Persist raw event before enqueuing — never lose the payload
  try {
    await db.webhookEvent.upsert({
      where: { eventId: transactionId },
      create: {
        eventId: transactionId,
        gateway: "AUTHORIZE_NET",
        companyId,
        payload: body,
        status: "PENDING",
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    const boss = getBoss();
    await boss.send(QUEUE_AUTHORIZE_NET, { eventId: transactionId });
    console.log(
      "[authorize-net/webhook] enqueued transactionId:",
      transactionId,
      "companyId:",
      companyId,
    );
  } catch (err) {
    console.error(
      "[authorize-net/webhook] Failed to persist/enqueue transactionId:",
      transactionId,
      err,
    );
  }

  // Always return 200 — non-200 causes Authorize.net to retry and eventually deactivate the webhook
  return NextResponse.json({ message: "Webhook queued" }, { status: 200 });
}
