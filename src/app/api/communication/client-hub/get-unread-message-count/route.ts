import { NextRequest, NextResponse } from "next/server";
import { getUnreadMessageCount } from "@/actions/communication/client/fetchLastMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/get-unread-message-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Unread message count fetched successfully
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;

    const data = await getUnreadMessageCount(companyId);

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to get unread message count" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
