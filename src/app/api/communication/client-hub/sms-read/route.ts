import { readClientSMS } from "@/actions/communication/client/chat-track";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/client-hub/sms-read:
 *   post:
 *     summary: Mark client SMS as read
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
 *         description: SMS marked as read
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await readClientSMS(body.clientId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "SMS read failed" },
      { status: 500 },
    );
  }
}
