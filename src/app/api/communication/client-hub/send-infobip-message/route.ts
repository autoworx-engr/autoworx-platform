import { NextRequest, NextResponse } from "next/server";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";

/**
 * @swagger
 * /api/communication/client-hub/send-infobip-message:
 *   post:
 *     summary: Send SMS/MMS via Infobip
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

    const attachments = (body.attachments ?? []).map((a: any) => ({
      url: a.url,
      name: a.name,
      isVoiceNote: a.isVoiceNote ?? false,
    }));

    const data = await sendInfobipMessage({
      companyId: body.companyId,
      clientId: body.clientId,
      message: body.message,
      attachments,
    });

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.error || "Failed to send message" },
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
