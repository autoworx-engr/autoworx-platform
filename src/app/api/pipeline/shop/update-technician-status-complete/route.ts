import { updateTechnicianStatustoComplete } from "@/actions/estimate/invoice/updateTechnicianStatustoComplete";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/update-technician-status-complete:
 *   patch:
 *     summary: Mark all technicians on an invoice as complete
 *     description: Called when an invoice is moved to the "Delivered" column. Sets all assigned technician statuses to "Complete" and sends job completion notifications.
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
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *     responses:
 *       200:
 *         description: Technician statuses updated to complete
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
 *                   example: Technician statuses updated to complete
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
 *                   example: invoiceId is required
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
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: "invoiceId is required" },
        { status: 400 },
      );
    }

    await updateTechnicianStatustoComplete(invoiceId, principal.userId);

    return NextResponse.json({
      success: true,
      message: "Technician statuses updated to complete",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update technician statuses",
      },
      { status: 500 },
    );
  }
}
