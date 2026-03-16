import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/shop/company/{companyId}:
 *   get:
 *     tags:
 *       - Shop
 *     summary: Get shops by companyId
 *     description: Retrieve all shops belonging to a specific company with pagination.
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         description: Company ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of records per page
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Shops fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 20
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       slug:
 *                         type: string
 *                         example: auto-parts
 *                       storeName:
 *                         type: string
 *                         example: Auto Parts Store
 *                       description:
 *                         type: string
 *                       logoUrl:
 *                         type: string
 *                       bannerUrl:
 *                         type: string
 *                       themeConfig:
 *                         type: object
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid companyId
 *       500:
 *         description: Failed to fetch shops
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } },
) {
  try {
    const companyId = Number(params.companyId);

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid companyId",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const skip = (page - 1) * limit;

    const shop = await db.shop.findFirst({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch shops",
      },
      { status: 500 },
    );
  }
}
