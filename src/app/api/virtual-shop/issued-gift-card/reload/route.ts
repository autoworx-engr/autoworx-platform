import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { AppError } from "@/error-boundary/error";
import { TransactionType } from "@prisma/client";

const maskGiftCardCode = (code: string) => {
  const visibleChars = Math.min(4, code.length);
  const maskedPart = "*".repeat(Math.max(0, code.length - visibleChars));
  return `${maskedPart}${code.slice(-visibleChars)}`;
};

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
 * /api/virtual-shop/issued-gift-card/reload:
 *   post:
 *     summary: Reload Gift Card Balance
 *     description: Add funds to an existing active gift card after a verified payment.
 *     tags:
 *       - Virtual Shop Gift
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               paymentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully reloaded the gift card.
 *       400:
 *         description: Invalid request parameters or frozen/expired card.
 *       409:
 *         description: Payment is still processing.
 *       404:
 *         description: Gift card not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = typeof body?.code === "string" ? body.code : "";
    const normalizedCode = rawCode.trim().toUpperCase();
    const paymentId = Number(body?.paymentId);

    if (!normalizedCode || !Number.isInteger(paymentId) || paymentId <= 0) {
      throw new AppError(
        400,
        "Please provide a valid gift card code and payment session.",
      );
    }

    const referenceId = `PAYMENT-${paymentId}`;

    const result = await db.$transaction(async (tx) => {
      const giftCard = await tx.issuedGiftCard.findUnique({
        where: { code: normalizedCode },
        select: {
          id: true,
          code: true,
          status: true,
          currentBalance: true,
          companyId: true,
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

      const existingReload = await tx.giftCardTransaction.findFirst({
        where: {
          giftCardId: giftCard.id,
          type: TransactionType.RELOAD,
          referenceId,
        },
      });

      if (existingReload) {
        const existingCard = await tx.issuedGiftCard.findUniqueOrThrow({
          where: { id: giftCard.id },
          select: {
            id: true,
            code: true,
            status: true,
            currentBalance: true,
          },
        });

        return {
          card: existingCard,
          addedAmount: Number(existingReload.amount),
        };
      }

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          companyId: true,
          amount: true,
          notes: true,
          stripePayment: {
            select: { id: true },
          },
          authorizeNetPayment: {
            select: { id: true },
          },
        },
      });

      if (!payment || payment.companyId !== giftCard.companyId) {
        throw new AppError(404, "Payment session not found.");
      }

      const paymentNotes = parseNotes(payment.notes);
      if (paymentNotes?.source !== "virtual_shop_gift_card_reload") {
        throw new AppError(400, "Invalid payment source for gift card reload.");
      }

      const paymentCode = paymentNotes?.reloadData?.code;
      if (paymentCode && paymentCode !== normalizedCode) {
        throw new AppError(400, "Payment session does not match gift card.");
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

      const reloadAmount = Number(payment.amount || 0);
      if (!Number.isFinite(reloadAmount) || reloadAmount <= 0) {
        throw new AppError(400, "Invalid paid amount for gift card reload.");
      }

      const newBalance = Number(giftCard.currentBalance) + reloadAmount;
      const newStatus = newBalance > 0 ? "ACTIVE" : giftCard.status;

      const updatedCard = await tx.issuedGiftCard.update({
        where: { id: giftCard.id },
        data: {
          currentBalance: newBalance,
          status: newStatus,
        },
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: TransactionType.RELOAD,
          amount: reloadAmount,
          balanceAfter: newBalance,
          referenceId,
          notes: "Reloaded via Virtual Shop Reload API (paid)",
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          notes: JSON.stringify({
            ...paymentNotes,
            reloadApplied: true,
            reloadedGiftCardId: giftCard.id,
          }),
        },
      });

      return {
        card: updatedCard,
        addedAmount: reloadAmount,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Gift card reloaded successfully.",
        data: {
          maskedCode: maskGiftCardCode(result.card.code),
          balance: Number(result.card.currentBalance),
          addedAmount: result.addedAmount,
          status: result.card.status,
          id: result.card.id,
        },
      },
      { status: 200 },
    );
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
