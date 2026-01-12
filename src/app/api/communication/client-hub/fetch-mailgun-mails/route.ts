import { NextRequest, NextResponse } from "next/server";
import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/mails:
 *   get:
 *     summary: Fetch emails for a client
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
 *         required: false
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: All mails retrieved successfully
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
 *                   example: All mails retrieved successfully!
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 7
 *                       subject:
 *                         type: string
 *                         example: Test
 *                       text:
 *                         type: string
 *                         example: test email
 *                       emailBy:
 *                         type: string
 *                         example: Company
 *                       messageId:
 *                         type: string
 *                         example: csxv67q9qhjbds7x2p4y
 *                       companyId:
 *                         type: number
 *                         example: 1
 *                       clientId:
 *                         type: number
 *                         example: 1
 *                       userId:
 *                         type: number
 *                         nullable: true
 *                         example: null
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T05:41:18.527Z
 *                       attachments:
 *                         type: array
 *                         items:
 *                           type: object
 *                         example: []
 *                       user:
 *                         type: object
 *                         nullable: true
 *                         example: null
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "clientId is required" },
        { status: 400 }
      );
    }

    const data = await fetchMailsMailgun(clientId, companyId);

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch emails" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All mails retrieved successfully!",
      data: data.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
