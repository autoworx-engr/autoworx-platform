import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";

/**
 * @swagger
 * /api/virtual-shop/shop-services/categories:
 *   get:
 *     summary: Retrieve unique categories for a shop's active services
 *     description: Fetch a deduplicated list of category names associated with all active shop services for a given shop ID. This is useful for building dynamic category filters on the frontend.
 *     tags:
 *       - Virtual Shop
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shop to fetch categories for.
 *     responses:
 *       200:
 *         description: Successfully retrieved all unique categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Detailing", "Paint Correction", "Ceramic Coating", "Maintenance"]
 *       400:
 *         description: Missing or invalid shopId parameter.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopIdParam = searchParams.get("shopId");

    if (!shopIdParam) {
      throw new AppError(400, "Missing required parameter: shopId");
    }

    const shopId = parseInt(shopIdParam, 10);
    if (isNaN(shopId)) {
      throw new AppError(400, "Invalid shopId parameter");
    }

    // Fetch only the categories for active services of the specified shop
    const services = await db.shopService.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        category: true,
      },
    });

    // Flatten the category arrays and extract unique values
    const uniqueCategories = Array.from(
      new Set(services.flatMap((srv) => srv.category || [])),
    ).filter(Boolean); // Filter out any accidentally empty or null values if applicable

    return NextResponse.json(
      {
        success: true,
        data: uniqueCategories,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching shop service categories:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch categories",
      },
      { status: 500 },
    );
  }
}
