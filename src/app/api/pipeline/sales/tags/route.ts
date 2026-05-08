import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/tags:
 *   get:
 *     summary: Get all SALES tags for a company
 *     tags: [Sales Pipeline Tags]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Tags fetched successfully
 *       400:
 *         description: companyId is required
 *       500:
 *         description: Failed to fetch tags
 */
export async function GET(request: NextRequest) {
  try {
    const companyIdParam = request.nextUrl.searchParams.get("companyId");
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : NaN;

    if (isNaN(companyId)) {
      return NextResponse.json(
        { success: false, error: "companyId is required" },
        { status: 400 },
      );
    }

    const tags = await db.tag.findMany({
      where: { companyId, type: "SALES" },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error: any) {
    console.error("Error in GET /api/pipeline/sales/tags:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/pipeline/sales/tags:
 *   post:
 *     summary: Create a new SALES tag for a company
 *     tags: [Sales Pipeline Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - name
 *               - bgColor
 *               - textColor
 *             properties:
 *               companyId:
 *                 type: integer
 *               name:
 *                 type: string
 *               bgColor:
 *                 type: string
 *               textColor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag created successfully
 *       400:
 *         description: Missing required fields or duplicate tag name
 *       500:
 *         description: Failed to create tag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, bgColor, textColor } = body;

    if (!companyId || !name || !bgColor || !textColor) {
      return NextResponse.json(
        {
          success: false,
          error: "companyId, name, bgColor, and textColor are required",
        },
        { status: 400 },
      );
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Tag name cannot be empty" },
        { status: 400 },
      );
    }

    const existing = await db.tag.findFirst({
      where: {
        companyId: parseInt(companyId),
        name: { equals: trimmedName },
        type: "SALES",
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A tag with this name already exists" },
        { status: 400 },
      );
    }

    const tag = await db.tag.create({
      data: {
        companyId: parseInt(companyId),
        name: trimmedName,
        bgColor,
        textColor,
        type: "SALES",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tag created successfully",
      data: tag,
    });
  } catch (error: any) {
    console.error("Error in POST /api/pipeline/sales/tags:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create tag" },
      { status: 500 },
    );
  }
}
