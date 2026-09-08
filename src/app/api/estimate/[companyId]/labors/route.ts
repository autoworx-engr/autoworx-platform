import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";

/**
 * @swagger
 * /api/estimate/{companyId}/labors:
 *   get:
 *     summary: Get canned labors for a company
 *     description: Returns pre-defined (canned) labor entries for the given company. These are reusable labor templates with hourly rates used when adding line items to an estimate.
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
 *           example: "Brake"
 *         description: Filter labors by name, notes or category name
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *           example: 2
 *         description: Filter labors by category ID
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
 *         description: Labors fetched successfully
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
 *                       hours:
 *                         type: number
 *                       charge:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       categoryId:
 *                         type: integer
 *                       notes:
 *                         type: string
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId, cannedLabor: true };

    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    const searchAnd = buildWordSearchAnd(search, [
      "name",
      "notes",
      "category.name",
    ]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [labors, total] = await Promise.all([
      db.labor.findMany({
        where,
        orderBy: { id: "desc" },
        ...(search ? {} : { skip, take: limit }),
        include: {
          tags: {
            include: { tag: true },
          },
        },
      }),
      db.labor.count({ where }),
    ]);

    // Flatten tag objects to match the shape used by the create page
    const laborsWithFlatTags = labors.map((labor) => ({
      ...labor,
      tags: labor.tags.map((t) => t.tag),
    }));

    return NextResponse.json({
      success: true,
      data: laborsWithFlatTags,
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
            hasMore: skip + labors.length < total,
          },
    });
  } catch (error) {
    console.error("ESTIMATE LABORS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch labors" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/estimate/{companyId}/labors:
 *   post:
 *     summary: Create a canned labor
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
 *                 example: "Brake Pad Replacement"
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               hours:
 *                 type: number
 *                 example: 1.5
 *               charge:
 *                 type: number
 *                 example: 75.00
 *               discount:
 *                 type: number
 *                 example: 0
 *               notes:
 *                 type: string
 *                 example: "Standard brake job"
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Labor created successfully
 *       400:
 *         description: name is required
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
    const { name, categoryId, hours, charge, discount, notes, tagIds } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const labor = await db.$transaction(async (tx) => {
      const created = await tx.labor.create({
        data: {
          name: name.trim(),
          companyId,
          cannedLabor: true,
          categoryId: categoryId ? Number(categoryId) : undefined,
          hours: hours != null ? Number(hours) : undefined,
          charge: charge != null ? Number(charge) : undefined,
          discount: discount != null ? Number(discount) : undefined,
          notes: notes?.trim() || undefined,
        },
      });

      if (Array.isArray(tagIds) && tagIds.length > 0) {
        await tx.laborTag.createMany({
          data: tagIds.map((tagId: number) => ({ laborId: created.id, tagId })),
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, data: labor }, { status: 201 });
  } catch (error) {
    console.error("CREATE LABOR ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create labor" },
      { status: 500 },
    );
  }
}
