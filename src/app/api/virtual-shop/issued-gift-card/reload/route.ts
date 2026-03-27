import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/issued-gift-card/reload:
 *   post:
 *     summary: Reload Gift Card Balance
 *     description: Add funds to an existing active gift card using its secure code.
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
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successfully reloaded the gift card.
 *       400:
 *         description: Invalid request parameters or frozen/expired card.
 *       404:
 *         description: Gift card not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, amount } = body;

    if (!code || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide a valid gift card code and an amount greater than 0.",
        },
        { status: 400 },
      );
    }

    // Use a transaction since we are updating a balance and creating a ledger entry
    const result = await db.$transaction(async (tx) => {
      const giftCard = await tx.issuedGiftCard.findUnique({
        where: { code },
      });

      if (!giftCard) {
        throw new Error("Gift card not found.");
      }

      if (giftCard.status !== "ACTIVE") {
        throw new Error(
          `Cannot reload a ${giftCard.status.toLowerCase()} gift card. Status must be active.`,
        );
      }

      const newBalance = Number(giftCard.currentBalance) + amount;
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
          type: "RELOAD",
          amount: amount,
          balanceAfter: newBalance,
          notes: "Reloaded via Virtual Shop Reload API",
        },
      });

      return updatedCard;
    });

    // Format the code masking to handle any length (ensure last 4 are visible if length > 4)
    const visibleChars = Math.min(4, code.length);
    const maskedPart = "*".repeat(Math.max(0, code.length - visibleChars));
    const maskedCode = `${maskedPart}${code.slice(-visibleChars)}`;

    return NextResponse.json(
      {
        success: true,
        message: "Gift card reloaded successfully.",
        data: {
          maskedCode,
          balance: Number(result.currentBalance),
          addedAmount: amount,
          status: result.status,
          id: result.id,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.message === "Gift card not found.") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 },
      );
    }
    if (error.message.startsWith("Cannot reload a")) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

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
