import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/categories:
 *   get:
 *     summary: Get service/material categories for a company
 *     description: Returns all categories belonging to the given company. Used to categorize services, materials and labors when creating an estimate.
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
 *           example: "Brakes"
 *         description: Filter categories by name
 *     responses:
 *       200:
 *         description: Categories fetched successfully
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
    const search = searchParams.get("search")?.trim() || undefined;

    const where: Record<string, any> = { companyId };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const categories = await db.category.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("ESTIMATE CATEGORIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/estimate/{companyId}/categories:
 *   post:
 *     summary: Create a category
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
 *                 example: "Brakes"
 *               color:
 *                 type: string
 *                 example: "#94A3B8"
 *     responses:
 *       201:
 *         description: Category created successfully
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
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const existing = await db.category.findFirst({
      where: { companyId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 400 },
      );
    }

    const category = await db.category.create({
      data: {
        companyId,
        name: name.trim(),
        ...(color && { color }),
      },
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create category" },
      { status: 500 },
    );
  }
}
