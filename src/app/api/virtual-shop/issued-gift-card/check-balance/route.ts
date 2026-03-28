import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/issued-gift-card/check-balance:
 *   get:
 *     summary: Check Gift Card Balance
 *     description: Retrieve balance and safe details of a gift card using its code.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: The secure gift card code
 *     responses:
 *       200:
 *         description: Successfully retrieved the gift card balance.
 *       400:
 *         description: Missing query parameters.
 *       404:
 *         description: Gift card not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a gift card code.",
        },
        { status: 400 },
      );
    }

    const giftCard = await db.issuedGiftCard.findUnique({
      where: { code },
    });

    if (!giftCard) {
      return NextResponse.json(
        {
          success: false,
          message: "Gift card not found. Please check the code and try again.",
        },
        { status: 404 },
      );
    }

    // Format the code masking to handle any length (ensure last 4 are visible if length > 4)
    const visibleChars = Math.min(4, code.length);
    const maskedPart = "*".repeat(Math.max(0, code.length - visibleChars));
    const maskedCode = `${maskedPart}${code.slice(-visibleChars)}`;

    const safeData = {
      maskedCode,
      balance: Number(giftCard.currentBalance),
      amount: Number(giftCard.initialBalance),
      status: giftCard.status,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Balance retrieved successfully.",
        data: safeData,
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
