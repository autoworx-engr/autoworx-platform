import { NextRequest, NextResponse } from "next/server";
import { sendTwilioMessageService } from "@/actions/services/communication/client/sendTwilioMessage.service";

/**
 * @swagger
 * /api/communication/client-hub/send-twilio-message:
 *   post:
 *     summary: Send SMS via Twilio
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
 *               - companyId
 *               - clientId
 *               - message
 *             properties:
 *               companyId:
 *                 type: number
 *               clientId:
 *                 type: number
 *               message:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await sendTwilioMessageService({
      companyId: body.companyId,
      clientId: body.clientId,
      message: body.message,
      attachments: body.attachments ?? [],
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
