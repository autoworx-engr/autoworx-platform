import { NextRequest, NextResponse } from "next/server";
import getSms from "@/app/(dashboard)/dashboard/communication/client/_actions/getSms";

/**
 * @swagger
 * /api/communication/client-hub/get-sms:
 *   get:
 *     summary: Get SMS messages for a client
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
 *
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: number
 *         example: 2
 *
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of records per page
 *         example: 20
 *
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number (1-based)
 *         example: 1
 *
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
 *
 *       400:
 *         description: Bad request
 *
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const clientIdParam = searchParams.get("clientId");
    const companyIdParam = searchParams.get("companyId");
    const take = searchParams.get("take");
    const page = searchParams.get("page");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 },
      );
    }

    const clientId = Number(clientIdParam);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "clientId must be a valid number" },
        { status: 400 },
      );
    }

    const companyId = companyIdParam ? Number(companyIdParam) : undefined;

    const data = await getSms(
      clientId,
      {
        take: Number(take) || (20 as number),
        skip: (Number(page) - 1) * Number(take) || 20,
        orderBy: { createdAt: "desc" },
      },
      companyId,
    );

    return NextResponse.json({
      success: true,
      message: "SMS messages retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve SMS messages",
      },
      { status: 500 },
    );
  }
}
