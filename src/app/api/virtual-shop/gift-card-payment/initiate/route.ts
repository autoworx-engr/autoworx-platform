import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import {
  buildGiftCardPurchaseContext,
  giftCardPurchaseSchema,
} from "@/services/giftCardPurchaseService";
import { NextResponse } from "next/server";

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

      const hasStripe = Boolean(context.shop.company.stripeAccountId);
      const hasAuthorizeNet = Boolean(
        context.shop.company.authorizeNetApiLoginId &&
        context.shop.company.authorizeNetTransactionKey,
      );

      if (!hasStripe && !hasAuthorizeNet) {
        throw new AppError(400, "No payment gateway configured for this shop");
      }

      let paymentMethod = await tx.paymentMethod.findFirst({
        where: {
          companyId: context.shop.companyId,
          name: "Virtual Shop Gift Card",
        },
      });

      if (!paymentMethod) {
        paymentMethod = await tx.paymentMethod.create({
          data: {
            companyId: context.shop.companyId,
            name: "Virtual Shop Gift Card",
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          companyId: context.shop.companyId,
          amount: context.finalAmount,
          type: "OTHER",
          notes: JSON.stringify({
            source: "virtual_shop_gift_card",
            purchaseData: parsed.data,
          }),
          other: {
            create: {
              paymentMethodId: paymentMethod.id,
            },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            paymentId: payment.id,
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
