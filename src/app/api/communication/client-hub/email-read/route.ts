import { readClientEmail } from "@/actions/communication/client/chat-track";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/client-hub/email-read:
 *   post:
 *     summary: Mark client Email as read
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
 *         description: Email marked as read
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await readClientEmail(body.clientId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Email read failed" },
      { status: 500 },
    );
  }
}
