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
 *         example: 3460
 *
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 4
 *
 *       - in: query
 *         name: take
 *         required: true
 *         schema:
 *           type: number
 *           default: 20
 *         description: Number of records per page
 *         example: 10
 *
 *       - in: query
 *         name: page
 *         required: true
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sms:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalSmsCount:
 *                       type: number
 *             example:
 *               success: true
 *               message: SMS messages retrieved successfully
 *               data:
 *                 sms:
 *                   - id: 12533
 *                     message: You missed a call from this number. Call to respond.
 *                     from: "+18788797134"
 *                     to: "+14702560094"
 *                     sentBy: Client
 *                     isRead: false
 *                     userId: null
 *                     companyId: 4
 *                     clientId: 3460
 *                     createdAt: "2026-01-11T19:06:03.431Z"
 *                     updatedAt: "2026-01-11T19:06:03.431Z"
 *                     attachments: []
 *                     user: null
 *                   - id: 12528
 *                     message: You have a missed call from TC Customs Atlanta. We'll try to reach you again soon or feel free to call us back.
 *                     from: "+14702560094"
 *                     to: "+18788797134"
 *                     sentBy: Company
 *                     isRead: true
 *                     userId: null
 *                     companyId: 4
 *                     clientId: 3460
 *                     createdAt: "2026-01-10T20:05:29.409Z"
 *                     updatedAt: "2026-01-10T20:05:29.409Z"
 *                     attachments: []
 *                     user: null
 *                 totalSmsCount: 71
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: false
 *               message: clientId is required
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: false
 *               message: Failed to retrieve SMS messages
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
    if (!companyIdParam) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }
    if (!take) {
      return NextResponse.json(
        { success: false, message: "take is required" },
        { status: 400 },
      );
    }
    if (!page) {
      return NextResponse.json(
        { success: false, message: "page is required" },
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

    const takeNumber = Number(take) || 20;
    const pageNumber = Number(page) || 1;

    const skip = (pageNumber - 1) * takeNumber;

    const { data, totalSmsCount } = await getSms(
      clientId,
      {
        take: takeNumber,
        skip,
        orderBy: { createdAt: "desc" },
      },
      companyId,
    );

    return NextResponse.json({
      success: true,
      message: "SMS messages retrieved successfully",
      data: {
        sms: data,
        totalSmsCount,
      },
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
