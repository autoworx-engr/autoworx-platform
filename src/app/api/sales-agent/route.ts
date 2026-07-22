import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInfobipMessageSalesAgent } from "@/actions/communication/client/sendInfobipMessageSalesAgent";
import { sendTwilioMessageSalesAgent } from "@/actions/communication/client/sendTwilioMessageSalesAgent";

/**
 * @swagger
 * /api/sales-agent:
 *   post:
 *     summary: Send SMS via Twilio and infobip from sales agent
 *     tags: [Sales Agent]
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
    const tag = `[SalesAgentReply][companyId=${body.companyId}, clientId=${body.clientId}]`;

    console.log(`${tag} reply webhook hit`, {
      message: body.message,
      attachments: body.attachments?.length ?? 0,
      isSalesAgent: body.isSalesAgent,
    });

    if (!body.companyId) {
      console.error(`${tag} missing companyId — rejecting`);
      return NextResponse.json(
        { success: false, message: "Company id is required!" },
        { status: 404 },
      );
    }

    const companyInfo = await db.company.findFirst({
      where: { id: Number(body.companyId) },
    });

    console.log(`${tag} smsGateway=${companyInfo?.smsGateway}`);

    let data: any = null;

    if (companyInfo?.smsGateway === "TWILIO") {
      console.log(`${tag} sending reply via Twilio`);
      data = await sendTwilioMessageSalesAgent({
        companyId: body.companyId,
        clientId: Number(body.clientId),
        message: body.message,
        attachments: body.attachments ?? [],
        isSalesAgent: Boolean(body.isSalesAgent),
      });
    } else {
      console.log(`${tag} sending reply via Infobip`);
      data = await sendInfobipMessageSalesAgent({
        companyId: body.companyId,
        clientId: Number(body.clientId),
        message: body.message,
        attachments: body.attachments ?? [],
        isSalesAgent: Boolean(body.isSalesAgent),
      });
    }

    if (data?.success) {
      console.log(`${tag} reply sent successfully`);
      return NextResponse.json({ success: true, data });
    } else {
      console.error(`${tag} reply send failed`, data);
      return NextResponse.json({ ...data });
    }
  } catch (error: any) {
    console.error("[SalesAgentReply] webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
