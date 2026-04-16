import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/estimate/{companyId}/tags:
 *   get:
 *     summary: Get general tags for a company
 *     description: Returns tags of type "GENERAL" for the given company. These are used to tag line items when creating or editing an estimate.
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
 *           example: "GENERAL"
 *           default: "GENERAL"
 *         description: Tag type filter (defaults to GENERAL)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "VIP"
 *         description: Filter tags by name
 *     responses:
 *       200:
 *         description: Tags fetched successfully
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
 *                       color:
 *                         type: string
 *                       type:
 *                         type: string
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
    const type = searchParams.get("type") || "GENERAL";
    const search = searchParams.get("search") || undefined;

    const where: Record<string, any> = { companyId, type };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const tags = await db.tag.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error("ESTIMATE TAGS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}
