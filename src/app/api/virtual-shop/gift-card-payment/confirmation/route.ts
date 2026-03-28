import { db } from "@/lib/db";
import { settleGiftCardPurchasePayment } from "@/services/giftCardPurchaseSettlementService";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

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

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid paymentId is required",
        },
        { status: 400 },
      );
    }

    const settlement = await settleGiftCardPurchasePayment(paymentId);
    const referenceId = `PAYMENT-${paymentId}`;

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

      return NextResponse.json(
        {
          success: true,
          data: {
            status: "issued",
            settlementStatus: settlement.status,
            confirmationNumber: issued.giftCard.orderNumber,
            maskedCode,
            amount: Number(issued.giftCard.initialBalance),
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
      where: { id: paymentId },
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
          status: isPaid ? "processing" : "pending_payment",
          settlementStatus: settlement.status,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to resolve gift card confirmation",
      },
      { status: 500 },
    );
  }
}
