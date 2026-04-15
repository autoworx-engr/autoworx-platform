import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const toFixedBase36 = (value: number, width: number) => {
  const encoded = Number(value).toString(36).toUpperCase();
  if (!Number.isInteger(value) || value <= 0 || encoded.length > width) {
    throw new AppError(500, "Unable to generate payment reference");
  }

  return encoded.padStart(width, "0");
};

const createReloadPaymentRef = (companyId: number, giftCardId: number) => {
  const companySegment = toFixedBase36(companyId, 4);
  const giftCardSegment = toFixedBase36(giftCardId, 4);
  const randomSegment = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `R${companySegment}${giftCardSegment}${randomSegment}`;
};

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
              tipEnabled: true,
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

      const paymentRef = createReloadPaymentRef(
        giftCard.companyId,
        giftCard.id,
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            paymentRef,
            giftCardId: giftCard.id,
            companyId: giftCard.companyId,
            amount,
            maskedCode: maskGiftCardCode(giftCard.code),
            gatewayInfo: {
              paymentGateway: giftCard.company.paymentGateway,
              hasStripe,
              hasAuthorizeNet,
              tipEnabled: giftCard.company.tipEnabled ?? false,
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
