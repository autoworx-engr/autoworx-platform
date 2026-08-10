import { NextRequest, NextResponse } from "next/server";
import { getInvoiceForService } from "@/app/(dashboard)/dashboard/communication/client/_actions/getInvoiceForService";

/**
 * @swagger
 * /api/communication/client-hub/get-invoice-for-service:
 *   get:
 *     summary: Get invoices for a client service
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
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
 *                   example: Invoices retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       invoiceItems:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             service:
 *                               type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    const data = await getInvoiceForService(clientId);

    return NextResponse.json({
      success: true,
      message: "Invoices retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve invoices",
      },
      { status: 500 },
    );
  }
}
