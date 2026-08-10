import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/inventoryWirehouse/category:
 *   get:
 *     summary: Get unique product categories
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unique categories
 *       500:
 *         description: Failed to fetch categories
 */
export async function GET(request: NextRequest) {
  try {
    const uniqueCategories = await db.inventoryWirehouseProduct.findMany({
      distinct: ["category"],
      select: {
        category: true,
      },
    });

    return NextResponse.json({
      data: uniqueCategories.map((item) => item.category),
    });
  } catch (error) {
    console.error("Error fetching unique categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch unique categories" },
      { status: 500 },
    );
  }
}
