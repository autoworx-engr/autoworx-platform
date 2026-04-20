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
