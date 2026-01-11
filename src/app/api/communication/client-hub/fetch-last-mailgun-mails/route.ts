import { NextRequest, NextResponse } from "next/server";
import { fetchLastMailsMailgun } from "@/actions/communication/client/fetchLastMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/fetch-last-mailgun-mails:
 *   get:
 *     summary: Fetch last Mailgun emails for all clients
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Last Mailgun emails fetched successfully
 */
export async function GET(req: NextRequest) {
  try {
    const data = await fetchLastMailsMailgun();

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch last emails" },
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
