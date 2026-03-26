import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
/**
 * @swagger
 * /api/virtual-shop/gift-card-templates/public:
 *   get:
 *     summary: List all gift card templates
 *     description: Fetch all active gift card UI templates for a specific company. This is a public route.
 *     tags:
 *       - Virtual Shop Gift
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the company to fetch templates for.
 *     responses:
 *       200:
 *         description: Successfully retrieved templates.
 *       400:
 *         description: Bad request (missing companyId).
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdStr = searchParams.get("companyId");

    if (!companyIdStr) {
      throw new AppError(400, "companyId query parameter is required");
    }

    const companyId = parseInt(companyIdStr, 10);

    const templates = await db.giftCardTemplate.findMany({
      where: {
        companyId,
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
