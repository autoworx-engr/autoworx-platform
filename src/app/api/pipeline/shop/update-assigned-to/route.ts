import { updateAssignedTo } from "@/actions/pipelines/getWorkOrders";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/update-assigned-to:
 *   patch:
 *     summary: Update the assigned user for a work order invoice
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
 *               - invoiceId
 *               - userId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *               userId:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Assigned user updated successfully
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
 *                   example: Assigned user updated successfully
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
 *                   example: invoiceId and userId are required
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
    const { invoiceId, userId } = body;

    if (!invoiceId || !userId) {
      return NextResponse.json(
        { success: false, message: "invoiceId and userId are required" },
        { status: 400 },
      );
    }

    await updateAssignedTo(invoiceId, userId);

    return NextResponse.json({
      success: true,
      message: "Assigned user updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update assigned user",
      },
      { status: 500 },
    );
  }
}
