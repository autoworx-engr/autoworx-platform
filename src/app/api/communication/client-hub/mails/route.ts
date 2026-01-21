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
 *         required: true
 *         schema:
 *           type: number
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
    const { searchParams } = new URL(req.url);
    const clientId = parseInt(searchParams.get("clientId") || "0");
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;
    const take = searchParams.get("take");
    const page = searchParams.get("page");

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

    const takeNumber = Number(take) || 20;
    const pageNumber = Number(page) || 1;

    const skip = (pageNumber - 1) * takeNumber;

    const data = await fetchMailsMailgun(clientId, companyId, {
      take: takeNumber,
      skip,
      orderBy: { createdAt: "desc" },
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch emails" },
        { status: 400 },
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
      { status: 400 },
    );
  }
}
