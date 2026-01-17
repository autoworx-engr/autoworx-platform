import { NextRequest, NextResponse } from "next/server";
import { getClients } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClients";

/**
 * @swagger
 * /api/communication/client-hub/get-clients:
 *   get:
 *     summary: Get clients with filtering and search
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *       - in: query
 *         name: filter
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Unread, Starred, Assigned]
 *         description: Optional filter for clients
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional search term
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: number
 *         example: 20
 *         description: Number of clients to retrieve
 *
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
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
 *                   example: Clients retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 11
 *                       firstName:
 *                         type: string
 *                         example: Saidul
 *                       lastName:
 *                         type: string
 *                         example: Islam
 *                       mobile:
 *                         type: string
 *                         example: "09885236058"
 *                       countryCode:
 *                         type: string
 *                         example: US
 *                       email:
 *                         type: string
 *                         example: saidulislam@gmail.com
 *                       isFleet:
 *                         type: boolean
 *                         example: false
 *                       photo:
 *                         type: string
 *                         example: /images/default.png
 *                       isStarred:
 *                         type: boolean
 *                         example: false
 *                       companyId:
 *                         type: number
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-14T05:05:37.239Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-14T05:14:36.974Z"
 *                       conversationsTrack:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 16
 *                           emailIsRead:
 *                             type: boolean
 *                             example: true
 *                           smsIsRead:
 *                             type: boolean
 *                             example: true
 *                           emailIsUnReadCount:
 *                             type: number
 *                             example: 0
 *                           smsUnReadCount:
 *                             type: number
 *                             example: 0
 *                           emailLastMessage:
 *                             type: string
 *                             example: testing attachment issue
 *                           smsLastMessage:
 *                             type: string
 *                             example: ""
 *                           lastMessageBy:
 *                             type: string
 *                             example: Company
 *                           sendAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-14T05:15:14.971Z"
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
 *                   example: Company ID is required
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
    const companyId = parseInt(searchParams.get("companyId") || "0");
    const filter = searchParams.get("filter") || undefined;
    const search = searchParams.get("search") || undefined;
    const takeParam = searchParams.get("take");
    const take = takeParam ? parseInt(takeParam) : undefined;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 }
      );
    }

    const data = await getClients({ companyId, filter, search, take });

    return NextResponse.json({
      success: true,
      message: "Clients retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve clients",
      },
      { status: 500 }
    );
  }
}
