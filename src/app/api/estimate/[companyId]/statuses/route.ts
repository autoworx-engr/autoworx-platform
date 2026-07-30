import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/statuses:
 *   get:
 *     summary: Get pipeline statuses (columns) for a company
 *     description: Returns all pipeline columns (statuses) for the given company. These represent the stages an estimate/invoice moves through (e.g. Pending, In Progress, Delivered, Completed). Used to populate the status selector when creating or updating an estimate.
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
 *         name: type
 *         schema:
 *           type: string
 *           example: "shop"
 *         description: Filter columns by type (e.g. "shop")
 *     responses:
 *       200:
 *         description: Statuses fetched successfully
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
 *                       title:
 *                         type: string
 *                         example: "Pending"
 *                       type:
 *                         type: string
 *                         example: "shop"
 *                       order:
 *                         type: integer
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/estimate/{companyId}/statuses:
 *   post:
 *     summary: Create a new pipeline column (status)
 *     description: Creates a new pipeline column for the given company. The column represents a stage an estimate/invoice moves through (e.g. Pending, In Progress). The `type` field must be either "sales" or "shop".
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - order
 *             properties:
 *               title:
 *                 type: string
 *                 example: "In Progress"
 *               type:
 *                 type: string
 *                 enum: [sales, shop]
 *                 example: "shop"
 *               order:
 *                 type: integer
 *                 example: 3
 *               textColor:
 *                 type: string
 *                 example: "#ffffff"
 *               bgColor:
 *                 type: string
 *                 example: "#3b82f6"
 *     responses:
 *       201:
 *         description: Column created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     type:
 *                       type: string
 *                     order:
 *                       type: integer
 *                     textColor:
 *                       type: string
 *                       nullable: true
 *                     bgColor:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Missing required fields or invalid company ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
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
    const { title, type, order, textColor, bgColor } = body;

    if (!title || !type || order === undefined) {
      return NextResponse.json(
        { success: false, message: "title, type, and order are required" },
        { status: 400 },
      );
    }

    if (!["sales", "shop"].includes(type)) {
      return NextResponse.json(
        { success: false, message: "type must be 'sales' or 'shop'" },
        { status: 400 },
      );
    }

    const column = await db.column.create({
      data: {
        title,
        type,
        order,
        textColor: textColor ?? null,
        bgColor: bgColor ?? null,
        companyId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        textColor: true,
        bgColor: true,
      },
    });

    return NextResponse.json({ success: true, data: column }, { status: 201 });
  } catch (error) {
    console.error("CREATE COLUMN ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create column" },
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
    const type = searchParams.get("type") || undefined;

    const where: Record<string, any> = { companyId };

    if (type) {
      where.type = type;
    }

    const statuses = await db.column.findMany({
      where,
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        bgColor: true,
      },
    });

    return NextResponse.json({ success: true, data: statuses });
  } catch (error) {
    console.error("ESTIMATE STATUSES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch statuses" },
      { status: 500 },
    );
  }
}
