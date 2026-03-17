import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/virtual-shop/configure:
 *   post:
 *     tags:
 *       - Virtual Shop
 *     summary: Setup a new virtual shop
 *     description: Create a new shop configuration for a company.
 *     operationId: createShop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeName
 *               - companyId
 *             properties:
 *               storeName:
 *                 type: string
 *                 example: Auto Parts Store
 *               description:
 *                 type: string
 *                 example: Best car parts shop in town
 *               logoUrl:
 *                 type: string
 *                 example: https://cdn.example.com/logo.png
 *               bannerUrl:
 *                 type: string
 *                 example: https://cdn.example.com/banner.png
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               themeConfig:
 *                 type: object
 *                 example:
 *                   primaryColor: "#3b82f6"
 *                   font: "Inter"
 *
 *     responses:
 *       200:
 *         description: Shop created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     storeName:
 *                       type: string
 *                       example: Auto Parts Store
 *                     slug:
 *                       type: string
 *                       example: auto-parts-store
 *                     companyId:
 *                       type: integer
 *                       example: 1
 *
 *       400:
 *         description: Validation error or slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: Slug already exists
 *
 *       500:
 *         description: Internal server error
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      storeName,
      description,
      logoUrl,
      bannerUrl,
      themeConfig,
      companyId,
    } = body;

    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!storeName || !slug) {
      return NextResponse.json(
        { success: false, message: "storeName and slug are required" },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existing = await db.shop.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Slug already exists" },
        { status: 400 },
      );
    }

    const shop = await db.shop.create({
      data: {
        companyId,
        storeName,
        slug,
        description: description ?? null,
        logoUrl,
        bannerUrl,
        themeConfig: themeConfig ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shop created successfully",
      data: shop,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
