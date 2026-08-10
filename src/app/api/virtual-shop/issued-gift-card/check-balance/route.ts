import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { AppError } from "@/error-boundary/error";

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
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: number
 *         required: true
 *         description: The shop ID
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
    const shopId = searchParams.get("shopId");

    if (!code) {
      throw new AppError(400, "Please provide a gift card code.");
    }

    if (!shopId) {
      throw new AppError(400, "Shop ID is required.");
    }

    const findShop = await db.shop.findUnique({
      where: {
        id: Number(shopId),
      },
    });

    if (!findShop) {
      throw new AppError(404, "Shop not found.");
    }

    const giftCard = await db.issuedGiftCard.findUnique({
      where: { code, shopId: Number(shopId) },
    });

    if (!giftCard) {
      throw new AppError(
        404,
        "Gift card not found. Please check the code and try again.",
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
