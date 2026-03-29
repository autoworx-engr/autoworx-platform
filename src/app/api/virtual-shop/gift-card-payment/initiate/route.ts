import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import {
  buildGiftCardPurchaseContext,
  giftCardPurchaseSchema,
} from "@/services/giftCardPurchaseService";
import { NextResponse } from "next/server";

const toFixedBase36 = (value: number, width: number) => {
  const encoded = Number(value).toString(36).toUpperCase();
  if (!Number.isInteger(value) || value <= 0 || encoded.length > width) {
    throw new AppError(500, "Unable to generate payment reference");
  }

  return encoded.padStart(width, "0");
};

const createPurchasePaymentRef = (companyId: number) => {
  const companySegment = toFixedBase36(companyId, 4);
  const timeSegment = Date.now().toString(36).toUpperCase().slice(-4);
  const randomSegment = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `P${companySegment}${timeSegment}${randomSegment}`;
};

/**
 * @swagger
 * /api/virtual-shop/gift-card-payment/initiate:
 *   post:
 *     summary: Initialize gift card checkout payment session
 *     tags:
 *       - Virtual Shop Gift
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment session created
 *       400:
 *         description: Invalid payload
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = giftCardPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0].message);
    }

    return await db.$transaction(async (tx) => {
      const context = await buildGiftCardPurchaseContext(tx, parsed.data);
      const paymentRef = createPurchasePaymentRef(context.shop.companyId);

      const hasStripe = Boolean(context.shop.company.stripeAccountId);
      const hasAuthorizeNet = Boolean(
        context.shop.company.authorizeNetApiLoginId &&
        context.shop.company.authorizeNetTransactionKey,
      );

      if (!hasStripe && !hasAuthorizeNet) {
        throw new AppError(400, "No payment gateway configured for this shop");
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            paymentRef,
            companyId: context.shop.companyId,
            amount: context.finalAmount,
            gatewayInfo: {
              paymentGateway: context.shop.company.paymentGateway,
              hasStripe,
              hasAuthorizeNet,
            },
          },
        },
        { status: 200 },
      );
    });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
}
