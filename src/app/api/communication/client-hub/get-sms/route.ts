import { NextRequest, NextResponse } from "next/server";
import getSms from "@/app/(dashboard)/dashboard/communication/client/_actions/getSms";

/**
 * @swagger
 * /api/communication/client-hub/get-sms:
 *   post:
 *     summary: Get SMS messages for a client
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: number
 *                 example: 1
 *               params:
 *                 type: object
 *                 description: Optional Prisma ClientSMSFindManyArgs
 *             required:
 *               - clientId
 *     responses:
 *       200:
 *         description: SMS messages retrieved successfully
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
 *                   example: SMS messages retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalSmsCount:
 *                       type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, params } = body;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 }
      );
    }

    const data = await getSms(clientId, params);

    return NextResponse.json({
      success: true,
      message: "SMS messages retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve SMS messages" },
      { status: 500 }
    );
  }
}
