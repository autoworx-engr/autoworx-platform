import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/get-columns:
 *   get:
 *     summary: Get all columns for the shop pipeline
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Columns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Columns retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: In Progress
 *                       type:
 *                         type: string
 *                         example: shop
 *                       order:
 *                         type: number
 *                         example: 0
 *                       textColor:
 *                         type: string
 *                         nullable: true
 *                         example: "#000000"
 *                       bgColor:
 *                         type: string
 *                         nullable: true
 *                         example: "#ffffff"
 *                       companyId:
 *                         type: number
 *                         example: 1
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
export async function GET(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const data = await getColumnsByType("shop");

    return NextResponse.json({
      success: true,
      message: "Columns retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve columns",
      },
      { status: 500 },
    );
  }
}
