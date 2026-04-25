import { NextRequest, NextResponse } from "next/server";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { db } from "@/lib/db";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";

/**
 * @swagger
 * /api/communication/client-hub/send-twilio-message:
 *   post:
 *     summary: Send SMS via Twilio and infobip
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

    if (!body.companyId) {
      return NextResponse.json(
        { success: false, message: "Company id is required!" },
        { status: 400 },
      );
    }

    const companyInfo = await db.company.findFirst({
      where: { id: body.companyId },
    });

    let data: any = null;

    const attachments = (body.attachments ?? []).map((a: any) => ({
      url: a.url,
      name: a.name,
      isVoiceNote: a.isVoiceNote ?? false,
    }));

    if (companyInfo?.smsGateway === "TWILIO") {
      data = await sendTwilioMessage({
        companyId: body.companyId,
        clientId: body.clientId,
        message: body.message,
        attachments,
        isSalesAgent: body.isSalesAgent,
        userId: body.userId,
      });
    } else {
      data = await sendInfobipMessage({
        companyId: body.companyId,
        clientId: body.clientId,
        message: body.message,
        attachments,
        isSalesAgent: body.isSalesAgent,
        userId: body.userId,
      });
    }

    if (data?.success) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ ...data });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
