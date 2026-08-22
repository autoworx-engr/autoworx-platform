import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";

/**
 * @swagger
 * /api/virtual-shop/configure/subdomain/{slug}:
 *   get:
 *     tags:
 *       - Virtual Shop
 *     summary: Get shop by subdomain (slug)
 *     description: Retrieve a single shop using its unique slug.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: Unique shop slug (subdomain)
 *         schema:
 *           type: string
 *           example: auto-parts-store
 *     responses:
 *       200:
 *         description: Shop fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     companyId:
 *                       type: integer
 *                     slug:
 *                       type: string
 *                     storeName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     logoUrl:
 *                       type: string
 *                     bannerUrl:
 *                       type: string
 *                     themeConfig:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     bookingSettings:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid slug
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const params = await props.params;
    const slug = params.slug;

    if (!slug) {
      throw new AppError(400, "Invalid slug");
    }

    const shop = await db.shop.findUnique({
      where: { slug },
      include: {
        bookingSettings: true,
        company: {
          select: {
            tax: true,
            serviceFee: true,
            phone: true,
          },
        },
      },
    });

    if (!shop) {
      throw new AppError(404, "Shop not found");
    }

    return NextResponse.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
