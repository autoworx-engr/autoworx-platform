import { updateColumnOrder } from "@/actions/pipelines/pipelinesColumn";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/update-column-order:
 *   patch:
 *     summary: Update the order of shop pipeline columns
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columns
 *             properties:
 *               columns:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - order
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 1
 *                     order:
 *                       type: number
 *                       example: 0
 *     responses:
 *       200:
 *         description: Column order updated successfully
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
 *                   example: Column order updated successfully
 *       400:
 *         description: Bad request
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
 *                   example: columns array is required
 *       500:
 *         description: Internal server error
 */
export async function PATCH(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const { columns } = body;

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, message: "columns array is required" },
        { status: 400 },
      );
    }

    await updateColumnOrder(columns);

    return NextResponse.json({
      success: true,
      message: "Column order updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update column order",
      },
      { status: 500 },
    );
  }
}
