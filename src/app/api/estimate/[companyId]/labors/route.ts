import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
 *         description: Filter labors by name or notes
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
    const companyId = Number(companyIdParam);

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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [labors, total] = await Promise.all([
      db.labor.findMany({
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
      pagination: {
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
