import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/materials:
 *   get:
 *     summary: Get inventory products (materials) for a company
 *     description: Returns inventory products of type "Product" for the given company. These are used as material line items when creating or editing an estimate. Each product is shaped with a `cost` alias for `price` and a flattened `tags` array.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Filter"
 *         description: Filter products by name or notes
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *           example: 3
 *         description: Filter products by category ID
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Filter products by vendor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Records per page (default 50)
 *     responses:
 *       200:
 *         description: Materials fetched successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       cost:
 *                         type: number
 *                         description: Alias for price, used in estimate line items
 *                       quantity:
 *                         type: number
 *                       categoryId:
 *                         type: integer
 *                       vendorId:
 *                         type: integer
 *                       productId:
 *                         type: integer
 *                         description: Same as id, for convenience when building estimate items
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                 pagination:
 *                   type: object
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } },
) {
  try {
    const companyId = Number(params.companyId);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid company ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const vendorId = searchParams.get("vendorId")
      ? Number(searchParams.get("vendorId"))
      : undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId, type: "Product" };

    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    if (vendorId && !isNaN(vendorId)) {
      where.vendorId = vendorId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      db.inventoryProduct.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          tags: {
            include: { tag: true },
          },
        },
      }),
      db.inventoryProduct.count({ where }),
    ]);

    // Match the shape used by the create page:
    // cost = price, productId = id, tags flattened
    const materials = products.map((product) => ({
      ...product,
      cost: product.price,
      productId: product.id,
      tags: product.tags.map((t) => t.tag),
    }));

    return NextResponse.json({
      success: true,
      data: materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + products.length < total,
      },
    });
  } catch (error) {
    console.error("ESTIMATE MATERIALS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch materials" },
      { status: 500 },
    );
  }
}
