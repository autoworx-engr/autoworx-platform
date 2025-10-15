import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = (searchParams.get("search") || "").trim();
    const categoryName = searchParams.get("categoryName") || "";
    const skip = (page - 1) * limit;

    // 🧠 Clean up search string for flexible matching
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
      const words = normalizedSearch.split(/\s+/); // split into words
      const wordConditions: string[] = [];

      words.forEach((word, index) => {
        params.push(`%${word}%`);
        const paramIndex = params.length;

        // each word must appear in at least one field
        wordConditions.push(`(
      LOWER("productName") ILIKE $${paramIndex} OR
      LOWER("category") ILIKE $${paramIndex}
    )`);
      });

      // combine all words with AND
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
      { status: 500 }
    );
  }
}
