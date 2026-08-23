import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { GiftCardStatus, Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/virtual-shop/gift-card:
 *   get:
 *     summary: Admin – List all purchased gift cards
 *     description: >
 *       Returns a paginated list of all issued (purchased) gift cards for the
 *       authenticated company. Supports full-text search, status filtering, and
 *       date-range filtering. Each record includes template details and a
 *       transaction count. A summary object with aggregate totals is also returned
 *       so the admin dashboard can display KPIs without a second request.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search across purchaser name, recipient name, code, and order number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DEPLETED, EXPIRED, FROZEN]
 *         description: Filter by gift card status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (inclusive), ISO 8601 date string
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (inclusive), ISO 8601 date string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: Successfully retrieved gift card purchase list.
 *       401:
 *         description: Unauthorized – missing or invalid token.
 *       403:
 *         description: Forbidden – company ID not found in token.
 *       500:
 *         description: Internal Server Error.
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

    const companyId = verifyToken.payload.companyId as number;
    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const { searchParams } = new URL(req.url);
    const shopIdStr = searchParams.get("shopId");
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const skip = (page - 1) * limit;

    if (!shopIdStr) {
      throw new AppError(400, "shopId query parameter is required");
    }

    const shopId = parseInt(shopIdStr, 10);

    const shop = await db.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.companyId !== companyId) {
      throw new AppError(404, "Shop not found or access denied");
    }

    const where: Prisma.IssuedGiftCardWhereInput = { shopId };

    if (
      statusParam &&
      Object.values(GiftCardStatus).includes(statusParam as GiftCardStatus)
    ) {
      where.status = statusParam as GiftCardStatus;
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to
          ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }
          : {}),
      };
    }

    if (search) {
      where.OR = [
        { purchaserName: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { purchaserEmail: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { orderNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [giftCards, totalCount, summary] = await Promise.all([
      db.issuedGiftCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
          _count: {
            select: { transactions: true },
          },
        },
      }),
      db.issuedGiftCard.count({ where }),
      db.issuedGiftCard.aggregate({
        where: { shopId },
        _sum: {
          initialBalance: true,
          currentBalance: true,
        },
        _count: { id: true },
      }),
    ]);

    const statusBreakdown = await db.issuedGiftCard.groupBy({
      by: ["status"],
      where: { shopId },
      _count: { id: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: giftCards,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
        summary: {
          totalIssued: summary._count.id,
          totalInitialValue: Number(summary._sum.initialBalance ?? 0),
          totalRemainingBalance: Number(summary._sum.currentBalance ?? 0),
          totalRedeemedValue:
            Number(summary._sum.initialBalance ?? 0) -
            Number(summary._sum.currentBalance ?? 0),
          statusBreakdown: statusBreakdown.reduce(
            (acc, row) => {
              acc[row.status] = row._count.id;
              return acc;
            },
            {} as Record<string, number>,
          ),
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
