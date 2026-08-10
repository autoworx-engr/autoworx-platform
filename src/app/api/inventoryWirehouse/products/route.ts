import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/inventoryWirehouse/products:
 *   get:
 *     summary: Get inventory warehouse products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated products list
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = (searchParams.get("search") || "").trim();
    const categoryName = searchParams.get("categoryName") || "";
    const skip = (page - 1) * limit;

    const normalizedSearch = search.replace(/\s+/g, " ").toLowerCase();

    let query = `
      SELECT * FROM "inventoryWirehouseProduct"
      WHERE TRUE
    `;

    let countQuery = `
      SELECT COUNT(*)::int AS "count" FROM "inventoryWirehouseProduct"
      WHERE TRUE
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      const words = normalizedSearch.split(/\s+/);
      const wordConditions: string[] = [];

      words.forEach((word, index) => {
        params.push(`%${word}%`);
        const paramIndex = params.length;

        wordConditions.push(`(
      LOWER("productName") ILIKE $${paramIndex} OR
      LOWER("category") ILIKE $${paramIndex}
    )`);
      });

      conditions.push(wordConditions.join(" AND "));
    }

    if (categoryName) {
      params.push(`%${categoryName.toLowerCase()}%`);
      conditions.push(`LOWER("category") ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      const conditionStr = " AND " + conditions.join(" AND ");
      query += conditionStr;
      countQuery += conditionStr;
    }

    query += ` ORDER BY "id" ASC LIMIT ${limit} OFFSET ${skip}`;

    const [products, countResult] = await Promise.all([
      db.$queryRawUnsafe(query, ...params),
      db.$queryRawUnsafe(countQuery, ...params),
    ]);

    const totalCount = Number((countResult as any)[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: products,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
