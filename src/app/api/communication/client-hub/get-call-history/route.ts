import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/communication/client-hub/get-call-history:
 *   get:
 *     summary: Get call history for a client with pagination
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
 *         description: The ID of the client
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: take
 *         required: true
 *         schema:
 *           type: number
 *         example: 20
 *         description: Number of records to take for pagination
 *
 *     responses:
 *       200:
 *         description: Call history retrieved successfully
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
 *                   example: Call history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       callSid:
 *                         type: string
 *                         example: "CA1234567890abcdef"
 *                       from:
 *                         type: string
 *                         example: "+1234567890"
 *                       to:
 *                         type: string
 *                         example: "+0987654321"
 *                       status:
 *                         type: string
 *                         example: "completed"
 *                       direction:
 *                         type: string
 *                         example: "outbound"
 *                       duration:
 *                         type: number
 *                         example: 120
 *                       recordingUrl:
 *                         type: string
 *                         example: "https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE..."
 *                       recordingSid:
 *                         type: string
 *                         example: "RE1234567890abcdef"
 *                       callStartTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-23T10:00:00.000Z"
 *                       callEndTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-23T10:02:00.000Z"
 *                       sentBy:
 *                         type: string
 *                         enum: [Client, Company]
 *                         example: "Company"
 *                       userId:
 *                         type: number
 *                         example: 1
 *                       companyId:
 *                         type: number
 *                         example: 1
 *                       clientId:
 *                         type: number
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-23T10:00:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-23T10:02:00.000Z"
 *                       playableUrl:
 *                         type: string
 *                         nullable: true
 *                         example: "https://yourapp.com/api/twilio/call-recording/RE1234567890abcdef"
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
 *                   example: Client ID is required
 *
 *       401:
 *         description: Unauthorized
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
 *                   example: Unauthorized access
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
 *                   example: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("clientId");
    const pageParam = searchParams.get("page");
    const takeParam = searchParams.get("take");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "Client ID is required" },
        { status: 400 },
      );
    }

    const clientId = parseInt(clientIdParam);
    const page = pageParam ? parseInt(pageParam) : 1;
    const skip = (page - 1) * 20;
    const take = takeParam ? parseInt(takeParam) : 20;

    if (isNaN(clientId) || isNaN(page) || isNaN(take)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameters" },
        { status: 400 },
      );
    }

    let calls = await db.clientCall.findMany({
      where: {
        clientId: clientId,
      },
      skip: skip,
      take: take,
      orderBy: {
        createdAt: "desc",
      },
    });

    const enrichedCalls = calls.map((call) => {
      let recordingSid = null;

      if (call.recordingUrl) {
        const match = call.recordingUrl.match(/Recordings\/(RE[a-zA-Z0-9]+)/);
        recordingSid = match ? match[1] : null;
      }

      return {
        ...call,
        playableUrl: recordingSid
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording/${recordingSid}`
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Call history retrieved successfully",
      data: enrichedCalls,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve call history",
      },
      { status: 500 },
    );
  }
}
