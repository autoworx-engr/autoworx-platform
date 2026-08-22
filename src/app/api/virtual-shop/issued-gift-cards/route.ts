import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/issued-gift-cards:
 *   get:
 *     summary: Retrieve a paginated list of issued gift cards
 *     description: Fetch all purchased gift cards for an authenticated company with optional search and pagination.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by purchaser name, recipient name, or code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of issued gift cards.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      companyId,
    };

    if (search) {
      whereClause.OR = [
        { purchaserName: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { orderNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [issuedGiftCards, totalCount] = await Promise.all([
      db.issuedGiftCard.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.issuedGiftCard.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: issuedGiftCards,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
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
