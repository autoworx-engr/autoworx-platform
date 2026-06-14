import { updateInvoiceStatus } from "@/actions/estimate/invoice/updateInvoiceStatus";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/update-invoice-status:
 *   patch:
 *     summary: Move an invoice to a different column in the shop pipeline
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
 *               - columnId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *               columnId:
 *                 type: number
 *                 example: 2
 *     responses:
 *       200:
 *         description: Invoice status updated successfully
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
 *                   example: Invoice status updated successfully
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
 *                   example: invoiceId and columnId are required
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
    const { invoiceId, columnId } = body;

    if (!invoiceId || !columnId) {
      return NextResponse.json(
        { success: false, message: "invoiceId and columnId are required" },
        { status: 400 },
      );
    }

    const result = await updateInvoiceStatus(invoiceId, columnId);

    if (result.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to update invoice status",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invoice status updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update invoice status",
      },
      { status: 500 },
    );
  }
}
