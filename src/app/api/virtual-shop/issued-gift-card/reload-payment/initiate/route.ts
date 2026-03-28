import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const maskGiftCardCode = (code: string) => {
  const visibleChars = Math.min(4, code.length);
  const maskedPart = "*".repeat(Math.max(0, code.length - visibleChars));
  return `${maskedPart}${code.slice(-visibleChars)}`;
};

/**
 * @swagger
 * /api/virtual-shop/issued-gift-card/reload-payment/initiate:
 *   post:
 *     summary: Initialize gift card reload payment session
 *     description: Creates a pending payment session for gift card reload.
 *     tags:
 *       - Virtual Shop Gift
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - amount
 *             properties:
 *               code:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Pending payment session created.
 *       400:
 *         description: Invalid payload or card/gateway state.
 *       404:
 *         description: Gift card not found.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = typeof body?.code === "string" ? body.code : "";
    const normalizedCode = rawCode.trim().toUpperCase();
    const amount = Number(body?.amount);

    if (!normalizedCode || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError(
        400,
        "Please provide a valid gift card code and an amount greater than 0.",
      );
    }

    return await db.$transaction(async (tx) => {
      const giftCard = await tx.issuedGiftCard.findUnique({
        where: { code: normalizedCode },
        select: {
          id: true,
          code: true,
          status: true,
          companyId: true,
          company: {
            select: {
              paymentGateway: true,
              stripeAccountId: true,
              authorizeNetApiLoginId: true,
              authorizeNetTransactionKey: true,
            },
          },
        },
      });

      if (!giftCard) {
        throw new AppError(404, "Gift card not found.");
      }

      if (giftCard.status !== "ACTIVE") {
        throw new AppError(
          400,
          `Cannot reload a ${giftCard.status.toLowerCase()} gift card. Status must be active.`,
        );
      }

      const hasStripe = Boolean(giftCard.company.stripeAccountId);
      const hasAuthorizeNet = Boolean(
        giftCard.company.authorizeNetApiLoginId &&
        giftCard.company.authorizeNetTransactionKey,
      );

      if (!hasStripe && !hasAuthorizeNet) {
        throw new AppError(400, "No payment gateway configured for this shop");
      }

      let paymentMethod = await tx.paymentMethod.findFirst({
        where: {
          companyId: giftCard.companyId,
          name: "Virtual Shop Gift Card Reload",
        },
      });

      if (!paymentMethod) {
        paymentMethod = await tx.paymentMethod.create({
          data: {
            companyId: giftCard.companyId,
            name: "Virtual Shop Gift Card Reload",
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          companyId: giftCard.companyId,
          amount,
          type: "OTHER",
          notes: JSON.stringify({
            source: "virtual_shop_gift_card_reload",
            reloadData: {
              giftCardId: giftCard.id,
              code: giftCard.code,
              requestedAmount: amount,
            },
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
            companyId: giftCard.companyId,
            amount,
            maskedCode: maskGiftCardCode(giftCard.code),
            gatewayInfo: {
              paymentGateway: giftCard.company.paymentGateway,
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
