import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
/**
 * @swagger
 * /api/virtual-shop/gift-card-templates/public:
 *   get:
 *     summary: List all gift card templates
 *     description: Fetch all active gift card UI templates for a specific shop. This is a public route.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop to fetch templates for.
 *     responses:
 *       200:
 *         description: Successfully retrieved templates.
 *       400:
 *         description: Bad request (missing shopId).
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopIdStr = searchParams.get("shopId");

    if (!shopIdStr) {
      throw new AppError(400, "shopId query parameter is required");
    }

    const shopId = parseInt(shopIdStr, 10);

    const templates = await db.giftCardTemplate.findMany({
      where: {
        shopId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: templates },
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
