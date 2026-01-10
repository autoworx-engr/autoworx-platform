import { NextRequest, NextResponse } from "next/server";
import { updateClientUnreadMessageToRead } from "@/actions/communication/client/updateClientUnreadMessage";

/**
 * @swagger
 * /api/communication/client-hub/update-client-unread-message:
 *   put:
 *     summary: Mark client SMS messages as read
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *             properties:
 *               clientId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await updateClientUnreadMessageToRead(body.clientId);

    if (data.type !== "success") {
      return NextResponse.json(
        { success: false, message: "Failed to update unread messages" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
