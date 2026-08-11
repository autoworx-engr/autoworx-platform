import { unreadClientSmsAndEmail } from "@/actions/communication/client/chat-track";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/client-hub/unread:
 *   post:
 *     summary: Mark a client SMS or email conversation as unread
 *     tags:
 *       - Client Conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Conversation marked as unread
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await unreadClientSmsAndEmail(body.clientId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Unread update failed" },
      { status: 500 },
    );
  }
}
