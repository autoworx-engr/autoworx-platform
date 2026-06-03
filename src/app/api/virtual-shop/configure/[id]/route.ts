import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/virtual-shop/configure/{id}:
 *   get:
 *     tags:
 *       - Virtual Shop
 *     summary: Get shops by id
 *     description: Retrieve all shops belonging to a specific company with pagination.
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Invalid id
 *       500:
 *         description: Failed to fetch shops
 */

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    if (!id) {
      throw new AppError(400, "Invalid id");
    }

    const { searchParams } = new URL(req.url);

    const shop = await db.shop.findFirst({
      where: {
        id,
      },
      include: {
        company: {
          select: {
            tax: true,
            serviceFee: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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
    // console.error(error);

    throw new AppError(500, "Failed to fetch shops");
  }
}

/**
 * @swagger
 * /api/virtual-shop/configure/{id}:
 *   patch:
 *     tags:
 *       - Virtual Shop
 *     summary: Update shop
 *     description: Update shop configuration by company ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: company ID
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *                 example: Auto Parts Store
 *               description:
 *                 type: string
 *                 example: Best car parts shop
 *               logoUrl:
 *                 type: string
 *                 example: /logo.png
 *               bannerUrl:
 *                 type: string
 *                 example: /banner.png
 *               themeConfig:
 *                 type: object
 *                 example: { "primaryColor": "#3b82f6", "font": "Inter" }
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Invalid shop ID
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Failed to update shop
 */

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    if (!id) {
      throw new AppError(400, "Invalid shopId");
    }

    const body = await req.json();

    const {
      storeName,
      description,
      logoUrl,
      bannerUrl,
      themeConfig,
      isActive,
      termsConditions,
      privacyPolicy,
      urgentBookingNotificationsEnabled,
    } = body;

    const existingShop = await db.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      throw new AppError(404, "Shop not found");
    }
    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const updatedShop = await db.shop.update({
      where: { id },
      data: {
        storeName,
        slug,
        description,
        logoUrl,
        bannerUrl,
        themeConfig,
        isActive,
        termsConditions: termsConditions ?? null,
        privacyPolicy: privacyPolicy ?? null,
        urgentBookingNotificationsEnabled:
          urgentBookingNotificationsEnabled ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shop updated successfully",
      data: updatedShop,
    });
  } catch (error) {
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
/**
 * @swagger
 * /api/virtual-shop/configure/{id}:
 *   delete:
 *     tags:
 *       - Virtual Shop
 *     summary: Delete shop
 *     description: Delete shop configuration by company ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: company ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Invalid shop ID
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Failed to update shop
 */

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    if (!id) {
      throw new AppError(400, "Invalid shopId");
    }

    const existingShop = await db.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      throw new AppError(404, "Shop not found");
    }

    const deletedShop = await db.shop.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Shop deleted successfully",
      data: deletedShop,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    throw new AppError(500, "Failed to update shop");
  }
}
