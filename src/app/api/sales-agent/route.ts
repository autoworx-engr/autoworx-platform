import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInfobipMessageSalesAgent } from "@/actions/communication/client/sendInfobipMessageSalesAgent";
import { sendTwilioMessageSalesAgent } from "@/actions/communication/client/sendTwilioMessageSalesAgent";
import { segmentMessage } from "@/lib/sms/segmentMessage";

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

    // Require something to send: a non-empty (non-whitespace) message, or at
    // least one attachment (attachment-only replies are valid). Reject early
    // — before any DB/provider work — so an empty body never reaches the
    // provider (Twilio rejects it with error 21602).
    const hasMessage =
      typeof body.message === "string" && body.message.trim().length > 0;

    if (!hasMessage) {
      console.error(`${tag} missing message — rejecting`);
      return NextResponse.json(
        { success: false, message: "Message is required!" },
        { status: 400 },
      );
    }

    const companyInfo = await db.company.findFirst({
      where: { id: Number(body.companyId) },
    });

    console.log(`${tag} smsGateway=${companyInfo?.smsGateway}`);

    // Carriers flag long single texts as spam, so a long AI-agent reply is
    // split into sentence-bounded chunks and sent as separate messages
    // instead of relying on the agent's prompt to self-limit length.
    const segments = segmentMessage(body.message);
    const attachments = body.attachments ?? [];

    // Attachment-only replies (empty body validated above) send once with an
    // empty body, which is a valid MMS.
    const messagesToSend = segments.length > 0 ? segments : [""];

    console.log(
      `${tag} sending reply as ${messagesToSend.length} segment(s)`,
      messagesToSend.map((s, i) => ({
        segment: `${i + 1}/${messagesToSend.length}`,
        length: s.length,
        text: s,
      })),
    );

    let data: any = null;

    for (let i = 0; i < messagesToSend.length; i++) {
      const isLastSegment = i === messagesToSend.length - 1;
      // Attachments ride along with the last segment only, so media isn't
      // duplicated across every text.
      const segmentAttachments = isLastSegment ? attachments : [];
      const segmentLabel = `segment ${i + 1}/${messagesToSend.length} (len=${messagesToSend[i].length})`;

      if (companyInfo?.smsGateway === "TWILIO") {
        console.log(`${tag} sending ${segmentLabel} via Twilio`, {
          text: messagesToSend[i],
        });
        data = await sendTwilioMessageSalesAgent({
          companyId: body.companyId,
          clientId: Number(body.clientId),
          message: messagesToSend[i],
          attachments: segmentAttachments,
          isSalesAgent: Boolean(body.isSalesAgent),
        });
      } else {
        console.log(`${tag} sending ${segmentLabel} via Infobip`, {
          text: messagesToSend[i],
        });
        data = await sendInfobipMessageSalesAgent({
          companyId: body.companyId,
          clientId: Number(body.clientId),
          message: messagesToSend[i],
          attachments: segmentAttachments,
          isSalesAgent: Boolean(body.isSalesAgent),
        });
      }

      if (!data?.success) {
        console.error(
          `${tag} reply send failed on segment ${i + 1}/${messagesToSend.length}`,
          data,
        );
        return NextResponse.json({ ...data });
      }
    }

    console.log(`${tag} reply sent successfully`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[SalesAgentReply] webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
