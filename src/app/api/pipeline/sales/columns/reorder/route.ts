import { updateColumnOrder } from "@/actions/pipelines/pipelinesColumn";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/columns/reorder:
 *   put:
 *     summary: Reorder multiple pipeline columns
 *     tags: [Sales Pipeline Columns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     order:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Column order updated successfully
 *       400:
 *         description: Items array is required
 *       500:
 *         description: Failed to update column order
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Items array is required" },
        { status: 400 },
      );
    }

    await updateColumnOrder(items);

    return NextResponse.json({
      success: true,
      message: "Column order updated",
    });
  } catch (error: any) {
    console.error("Error in PUT /api/pipeline/columns/reorder:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update column order",
      },
      { status: 500 },
    );
  }
}
