import { NextRequest, NextResponse } from "next/server";
import { getClientEstimate } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientEstimate";

/**
 * @swagger
 * /api/communication/client-hub/get-client-estimate:
 *   get:
 *     summary: Get client estimates
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Estimate, Invoice]
 *         example: Estimate
 *
 *     responses:
 *       200:
 *         description: Client estimates retrieved successfully
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
 *                   example: Client estimates retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: ESTIMATE
 *
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
 *                   example: clientId is required
 *
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
 *                   example: Failed to retrieve client estimates
 */

export const invoiceSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  convertedAt: true,
  deliveredAt: true,
  completedAt: true,
  type: true,
  clientId: true,
  vehicleId: true,
  subtotal: true,
  discount: true,
  tax: true,
  serviceFee: true,
  grandTotal: true,
  deposit: true,
  due: true,
  statusId: true,
  fleetStatementId: true,
  internalNotes: true,
  dueDate: true,
  terms: true,
  policy: true,
  customerNotes: true,
  customerComments: true,
  isTriggered: true,
  companyId: true,
  userId: true,
  assignedToId: true,
  fromRequest: true,
  fromRequestedCompanyId: true,
  requestEstimateId: true,
  columnId: true,
  profit: true,
  authorizedName: true,
  stripePaymentLink: true,
  isWorkOrder: true,
  workOrderCreatedAt: true,
  signatureImage: true,
  wasAuthorized: true,
  serviceIndex: true,
  totalPayment: true,
  damageNotes: true,
  columnChangedAt: true,
  isViewed: true,

  // Relations (optional but recommended)
  invoiceItems: true,
  vehicleParts: true,
  photos: true,
  tasks: true,
  payments: true,
  tags: true,
  technician: true,
  Material: true,
  InventoryProductHistory: true,
  Inspections: true,
  Refund: true,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const clientIdParam = searchParams.get("clientId");
    const type = searchParams.get("type");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 }
      );
    }

    const clientId = Number(clientIdParam);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "clientId must be a valid number" },
        { status: 400 }
      );
    }

    const data = await getClientEstimate(clientId, {
      where: {
        clientId: clientId,
        type: type as "Estimate" | "Invoice",
      },
      select: invoiceSelect,
    });

    return NextResponse.json({
      success: true,
      message: "Client estimates retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve client estimates",
      },
      { status: 500 }
    );
  }
}
