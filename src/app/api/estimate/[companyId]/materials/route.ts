import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";

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
/**
 * @swagger
 * /api/estimate/{companyId}/materials:
 *   post:
 *     summary: Create a material (inventory product of type Product)
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Brake Pad"
 *               description:
 *                 type: string
 *                 example: "High-performance brake pad"
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *               vendorId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               price:
 *                 type: number
 *                 example: 49.99
 *               quantity:
 *                 type: number
 *                 example: 10
 *               unit:
 *                 type: string
 *                 example: "pc"
 *               lot:
 *                 type: string
 *                 nullable: true
 *                 example: "LOT-001"
 *               lowInventoryAlert:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *     responses:
 *       201:
 *         description: Material created successfully
 *       400:
 *         description: name is required or already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const body = await req.json();
    const {
      name,
      description,
      categoryId,
      vendorId,
      price,
      quantity,
      unit,
      lot,
      lowInventoryAlert,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const existing = await db.inventoryProduct.findFirst({
      where: { companyId, name: name.trim(), type: "Product" },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A material with this name already exists" },
        { status: 400 },
      );
    }

    const material = await db.inventoryProduct.create({
      data: {
        name: name.trim(),
        companyId,
        type: "Product",
        description: description?.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        vendorId: vendorId ? Number(vendorId) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        unit: unit?.trim() || undefined,
        lot: lot?.trim() || undefined,
        lowInventoryAlert: lowInventoryAlert
          ? Number(lowInventoryAlert)
          : undefined,
      },
    });

    return NextResponse.json(
      { success: true, data: material },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE MATERIAL ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create material" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const vendorId = searchParams.get("vendorId")
      ? Number(searchParams.get("vendorId"))
      : undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId, type: "Product" };

    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    if (vendorId && !isNaN(vendorId)) {
      where.vendorId = vendorId;
    }

    const searchAnd = buildWordSearchAnd(search, ["name", "description"]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [products, total] = await Promise.all([
      db.inventoryProduct.findMany({
        where,
        orderBy: { name: "asc" },
        ...(search ? {} : { skip, take: limit }),
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
      pagination: search
        ? {
            page: 1,
            limit: total,
            total,
            totalPages: 1,
            hasMore: false,
          }
        : {
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
