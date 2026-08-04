import { db } from "@/lib/db";
import { settleGiftCardPurchasePayment } from "@/services/giftCardPurchaseSettlementService";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

const parseNotes = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;

  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
};

/**
 * @swagger
 * /api/virtual-shop/gift-card-payment/confirmation:
 *   post:
 *     summary: Resolve gift card purchase confirmation by payment session
 *     tags:
 *       - Virtual Shop Gift
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentId = Number(body?.paymentId);
    const paymentRef =
      typeof body?.paymentRef === "string" ? body.paymentRef.trim() : "";

    console.log("[gift-card][confirmation] request:", {
      paymentId,
      paymentRef,
    });

    if ((!Number.isInteger(paymentId) || paymentId <= 0) && !paymentRef) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid paymentId or paymentRef is required",
        },
        { status: 400 },
      );
    }

    let resolvedPaymentId: number | null =
      Number.isInteger(paymentId) && paymentId > 0 ? paymentId : null;

    if (!resolvedPaymentId && paymentRef) {
      const candidatePayment = await db.payment.findFirst({
        where: {
          notes: {
            contains: `\"paymentRef\":\"${paymentRef}\"`,
          },
        },
        orderBy: {
          id: "desc",
        },
        select: {
          id: true,
          notes: true,
        },
      });

      if (!candidatePayment) {
        console.log(
          "[gift-card][confirmation] no payment found yet for paymentRef:",
          paymentRef,
        );
        return NextResponse.json(
          {
            success: true,
            data: {
              status: "pending_payment",
            },
          },
          { status: 200 },
        );
      }

      const paymentNotes = parseNotes(candidatePayment.notes);
      if (
        (paymentNotes?.source !== "virtual_shop_gift_card" &&
          paymentNotes?.source !== "virtual_shop_gift_card_purchase") ||
        paymentNotes?.paymentRef !== paymentRef
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payment source for gift card purchase.",
          },
          { status: 400 },
        );
      }

      resolvedPaymentId = candidatePayment.id;
    }

    if (!resolvedPaymentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment session not found",
        },
        { status: 404 },
      );
    }

    const settlement = await settleGiftCardPurchasePayment(resolvedPaymentId);
    console.log("[gift-card][confirmation] settlement result:", {
      resolvedPaymentId,
      status: settlement.status,
      giftCardId: settlement.giftCardId,
    });
    const referenceId = `PAYMENT-${resolvedPaymentId}`;

    const issued = await db.giftCardTransaction.findFirst({
      where: {
        type: TransactionType.ISSUE,
        referenceId,
      },
      include: {
        giftCard: {
          select: {
            id: true,
            orderNumber: true,
            code: true,
            initialBalance: true,
            recipientName: true,
            scheduledSendAt: true,
          },
        },
      },
    });

    if (issued?.giftCard?.orderNumber) {
      const codeParts = issued.giftCard.code.split("-");
      const maskedCode = `${codeParts[0]}-****-${codeParts[2] || "****"}`;
      const issuedAmount = Number(
        issued.amount ?? issued.giftCard.initialBalance ?? 0,
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            status: "issued",
            settlementStatus: settlement.status,
            confirmationNumber: issued.giftCard.orderNumber,
            maskedCode,
            amount: issuedAmount,
            recipientName: issued.giftCard.recipientName,
            deliveryInfo: issued.giftCard.scheduledSendAt
              ? "Recipient • Scheduled"
              : "Recipient • Instant",
          },
        },
        { status: 200 },
      );
    }

    const payment = await db.payment.findUnique({
      where: { id: resolvedPaymentId },
      select: {
        id: true,
        stripePayment: {
          select: { id: true },
        },
        authorizeNetPayment: {
          select: { id: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment session not found",
        },
        { status: 404 },
      );
    }

    const isPaid = Boolean(
      payment.stripePayment || payment.authorizeNetPayment,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          status: isPaid ? "paid" : "pending_payment",
          paymentId: resolvedPaymentId,
          settlementStatus: settlement.status,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[gift-card][confirmation] failed:", error?.message, error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to resolve gift card confirmation",
      },
      { status: 500 },
    );
  }
}
