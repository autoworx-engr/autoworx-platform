import { updateColumn } from "@/actions/pipelines/pipelinesColumn";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/update-column:
 *   patch:
 *     summary: Update a shop pipeline column
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
 *               - id
 *               - title
 *               - order
 *             properties:
 *               id:
 *                 type: number
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: In Progress
 *               order:
 *                 type: number
 *                 example: 0
 *               textColor:
 *                 type: string
 *                 nullable: true
 *                 example: "#000000"
 *               bgColor:
 *                 type: string
 *                 nullable: true
 *                 example: "#ffffff"
 *     responses:
 *       200:
 *         description: Column updated successfully
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
 *                   example: Column updated successfully
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
 *                   example: id, title, and order are required
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
    const { id, title, order, textColor, bgColor } = body;

    if (!id || !title || order === undefined) {
      return NextResponse.json(
        { success: false, message: "id, title, and order are required" },
        { status: 400 },
      );
    }

    await updateColumn(id, title, "shop", order, textColor, bgColor);

    return NextResponse.json({
      success: true,
      message: "Column updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update column",
      },
      { status: 500 },
    );
  }
}
