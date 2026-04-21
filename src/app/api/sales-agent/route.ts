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

    if (!body.companyId) {
      return NextResponse.json(
        { success: false, message: "Company id is required!" },
        { status: 404 },
      );
    }

    const companyInfo = await db.company.findFirst({
      where: { id: Number(body.companyId) },
    });

    let data: any = null;

    if (companyInfo?.smsGateway === "TWILIO") {
      data = await sendTwilioMessageSalesAgent({
        companyId: body.companyId,
        clientId: Number(body.clientId),
        message: body.message,
        attachments: body.attachments ?? [],
        isSalesAgent: Boolean(body.isSalesAgent),
      });
    } else {
      data = await sendInfobipMessageSalesAgent({
        companyId: body.companyId,
        clientId: Number(body.clientId),
        message: body.message,
        attachments: body.attachments ?? [],
        isSalesAgent: Boolean(body.isSalesAgent),
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
