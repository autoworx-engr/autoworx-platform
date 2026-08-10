import { NextRequest, NextResponse } from "next/server";
import { getClientTask } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientTask";

/**
 * @swagger
 * /api/communication/client-hub/get-client-task:
 *   get:
 *     summary: Get tasks for a client
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Client tasks retrieved successfully
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
 *                   example: Client tasks retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");
    const companyId = parseInt(searchParams.get("companyId") || "0");

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const data = await getClientTask(clientId, companyId);

    return NextResponse.json({
      success: true,
      message: "Client tasks retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve client tasks",
      },
      { status: 500 },
    );
  }
}
