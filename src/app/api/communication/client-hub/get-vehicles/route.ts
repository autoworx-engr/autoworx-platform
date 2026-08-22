import { NextRequest, NextResponse } from "next/server";
import { getVehicles } from "@/app/(dashboard)/dashboard/communication/client/_actions/getVehicles";

/**
 * @swagger
 * /api/communication/client-hub/get-vehicles:
 *   get:
 *     summary: Get vehicles for a client
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
 *         description: Vehicles retrieved successfully
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
 *                   example: Vehicles retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       year:
 *                         type: string
 *                       make:
 *                         type: string
 *                       model:
 *                         type: string
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

    const data = await getVehicles(clientId);

    return NextResponse.json({
      success: true,
      message: "Vehicles retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve vehicles",
      },
      { status: 500 },
    );
  }
}
