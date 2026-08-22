import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { TransactionType } from "@prisma/client";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { maskGiftCardCode } from "@/utils/maskGiftCardCode";
import {
  buildGiftCardPurchaseContext,
  giftCardPurchaseSchema,
  issueGiftCardFromContext,
} from "@/services/giftCardPurchaseService";

const buyGiftCardSchema = giftCardPurchaseSchema.extend({
  paymentId: giftCardPurchaseSchema.shape.shopId.optional(),
});

/**
 * @swagger
 * /api/virtual-shop/buy-gift-card:
 *   post:
 *     summary: Purchase a new gift card via the virtual shop Public API
 *     description: Creates an issued gift card and necessary ledger transaction. Handles mock checkout logic.
 *     tags:
 *       - Virtual Shop Gift
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - templateId
 *               - purchaseType
 *               - amount
 *               - purchaserName
 *               - purchaserEmail
 *               - isSendToMyself
 *               - deliveryMethod
 *               - recipientName
 *             properties:
 *               shopId:
 *                 type: integer
 *               templateId:
 *                 type: integer
 *               purchaseType:
 *                 type: string
 *                 enum: [INDIVIDUAL, MULTIPLE_RECIPIENTS, GROUP_GIFT]
 *               amount:
 *                 type: number
 *               promoCode:
 *                 type: string
 *               purchaserName:
 *                 type: string
 *               purchaserEmail:
 *                 type: string
 *               purchaserPhone:
 *                 type: string
 *               isSendToMyself:
 *                 type: boolean
 *               deliveryMethod:
 *                 type: string
 *                 enum: [EMAIL, SMS, BOTH]
 *               recipientName:
 *                 type: string
 *               recipientEmail:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               scheduledSendAt:
 *                 type: string
 *                 format: date-time
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gift card successfully purchased.
 *       400:
 *         description: Validation error or settings restriction.
 *       404:
 *         description: Shop or template not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsedData = buyGiftCardSchema.safeParse(body);
    if (!parsedData.success) {
      throw new AppError(400, parsedData.error.errors[0].message);
    }

    const { paymentId, ...purchaseInput } = parsedData.data;

    return await db.$transaction(async (tx) => {
      const context = await buildGiftCardPurchaseContext(tx, purchaseInput);

      let paymentReferenceId: string | undefined;

      if (paymentId) {
        paymentReferenceId = `PAYMENT-${paymentId}`;

        const existingIssued = await tx.giftCardTransaction.findFirst({
          where: {
            type: TransactionType.ISSUE,
            referenceId: paymentReferenceId,
          },
          include: {
            giftCard: {
              select: {
                orderNumber: true,
                code: true,
                initialBalance: true,
                recipientName: true,
                scheduledSendAt: true,
              },
            },
          },
        });

        if (existingIssued?.giftCard?.orderNumber) {
          const maskedCode = maskGiftCardCode(existingIssued.giftCard.code);
          const issuedAmount = Number(
            existingIssued.amount ??
              existingIssued.giftCard.initialBalance ??
              0,
          );

          return NextResponse.json(
            {
              success: true,
              message: "Gift card already purchased",
              data: {
                confirmationNumber: existingIssued.giftCard.orderNumber,
                maskedCode,
                amount: issuedAmount,
                recipientName: existingIssued.giftCard.recipientName,
                deliveryInfo: `${purchaseInput.isSendToMyself ? "Self" : "Recipient"} • ${existingIssued.giftCard.scheduledSendAt ? "Scheduled" : "Instant"}`,
              },
            },
            { status: 200 },
          );
        }

        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            stripePayment: {
              select: { id: true },
            },
            authorizeNetPayment: {
              select: { id: true },
            },
          },
        });

        if (!payment || payment.companyId !== context.shop.companyId) {
          throw new AppError(404, "Payment session not found");
        }

        const isPaid = Boolean(
          payment.stripePayment || payment.authorizeNetPayment,
        );

        if (!isPaid) {
          throw new AppError(
            409,
            "Payment is still processing. Please retry shortly.",
          );
        }

        const paidAmount = Number(payment.amount || 0);
        if (paidAmount + 0.01 < context.finalAmount) {
          throw new AppError(
            400,
            "Paid amount is less than the required total",
          );
        }
      }

      const issuedGiftCard = await issueGiftCardFromContext(
        tx,
        purchaseInput,
        context,
        {
          referenceId: paymentReferenceId,
        },
      );

      return NextResponse.json(
        {
          success: true,
          message: "Gift card purchased successfully",
          data: {
            confirmationNumber: issuedGiftCard.confirmationNumber,
            maskedCode: issuedGiftCard.maskedCode,
            amount: issuedGiftCard.amount,
            recipientName: issuedGiftCard.recipientName,
            deliveryInfo: issuedGiftCard.deliveryInfo,
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
