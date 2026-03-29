import { db } from "@/lib/db";
import { settleGiftCardReloadPayment } from "@/services/giftCardReloadSettlementService";
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

const maskGiftCardCode = (code: string) => {
  const visibleChars = Math.min(4, code.length);
  const maskedPart = "*".repeat(Math.max(0, code.length - visibleChars));
  return `${maskedPart}${code.slice(-visibleChars)}`;
};

/**
 * @swagger
 * /api/virtual-shop/issued-gift-card/reload/confirmation:
 *   post:
 *     summary: Resolve gift card reload confirmation by payment session
 *     tags:
 *       - Virtual Shop Gift
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentId = Number(body?.paymentId);
    const paymentRef =
      typeof body?.paymentRef === "string" ? body.paymentRef.trim() : "";

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
        paymentNotes?.source !== "virtual_shop_gift_card_reload" ||
        paymentNotes?.paymentRef !== paymentRef
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payment source for gift card reload.",
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

    const settlement = await settleGiftCardReloadPayment(resolvedPaymentId);
    const referenceId = `PAYMENT-${resolvedPaymentId}`;

    const reloadTransaction = await db.giftCardTransaction.findFirst({
      where: {
        type: TransactionType.RELOAD,
        referenceId,
      },
      include: {
        giftCard: {
          select: {
            code: true,
            currentBalance: true,
            status: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    if (reloadTransaction?.giftCard?.code) {
      return NextResponse.json(
        {
          success: true,
          data: {
            status: "reloaded",
            settlementStatus: settlement.status,
            maskedCode: maskGiftCardCode(reloadTransaction.giftCard.code),
            addedAmount: Number(reloadTransaction.amount),
            balance: Number(reloadTransaction.giftCard.currentBalance),
            giftCardStatus: reloadTransaction.giftCard.status,
          },
        },
        { status: 200 },
      );
    }

    const payment = await db.payment.findUnique({
      where: { id: resolvedPaymentId },
      select: {
        id: true,
        notes: true,
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

    const paymentNotes = parseNotes(payment.notes);
    if (paymentNotes?.source !== "virtual_shop_gift_card_reload") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment source for gift card reload.",
        },
        { status: 400 },
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
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to resolve gift card reload",
      },
      { status: 500 },
    );
  }
}
