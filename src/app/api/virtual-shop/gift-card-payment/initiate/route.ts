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
      console.error(
        "[gift-card][initiate] validation failed:",
        parsed.error.errors[0].message,
      );
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
        console.error(
          "[gift-card][initiate] no gateway configured for companyId:",
          context.shop.companyId,
        );
        throw new AppError(400, "No payment gateway configured for this shop");
      }

      // Persist the purchase payload server-side up front, keyed by paymentRef.
      // The payment worker links the gateway charge to this row and settles it,
      // so issuance no longer depends on the browser returning from checkout.
      const paymentMethodName = "Virtual Shop Gift Card";
      let paymentMethod = await tx.paymentMethod.findFirst({
        where: { companyId: context.shop.companyId, name: paymentMethodName },
      });

      if (!paymentMethod) {
        paymentMethod = await tx.paymentMethod.create({
          data: { companyId: context.shop.companyId, name: paymentMethodName },
        });
      }

      const pendingPayment = await tx.payment.create({
        data: {
          companyId: context.shop.companyId,
          amount: context.finalAmount,
          type: "OTHER",
          date: new Date(),
          notes: JSON.stringify({
            source: "virtual_shop_gift_card",
            paymentRef,
            purchaseData: parsed.data,
          }),
          other: { create: { paymentMethodId: paymentMethod.id } },
        },
      });

      console.log("[gift-card][initiate] session created:", {
        paymentRef,
        paymentId: pendingPayment.id,
        companyId: context.shop.companyId,
        amount: context.finalAmount,
        hasStripe,
        hasAuthorizeNet,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            paymentRef,
            paymentId: pendingPayment.id,
            companyId: context.shop.companyId,
            amount: context.finalAmount,
            gatewayInfo: {
              paymentGateway: context.shop.company.paymentGateway,
              hasStripe,
              hasAuthorizeNet,
              tipEnabled: context.shop.company.tipEnabled ?? false,
            },
          },
        },
        { status: 200 },
      );
    });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    console.error(
      "[gift-card][initiate] failed:",
      formattedError.statusCode,
      formattedError.message,
    );
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
