import { NextRequest, NextResponse } from "next/server";
import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/fetch-mailgun-mails:
 *   get:
 *     summary: Fetch Mailgun emails for a client
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
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Mailgun emails fetched successfully
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

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
