import { db } from "@/lib/db";
import { twiml } from "twilio";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

/**
 * @swagger
 * /api/twilio/call-status:
 *   post:
 *     summary: Twilio call status callback webhook
 *     tags: [Twilio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               CallSid:
 *                 type: string
 *               DialCallStatus:
 *                 type: string
 *               CallStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call status processed
 */
export async function POST(request: Request) {
  console.log("📞 [Call-Status] Webhook called at:", new Date().toISOString());
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const callStatus = formData.get("CallStatus") as string;

    if (!callSid) {
      console.error("❌ [Call-Status] Missing CallSid");
      const errResponse = new twiml.VoiceResponse();
      return new Response(errResponse.toString(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Respond immediately — processing happens async to avoid Twilio 15s timeout
    processCallStatus({ callSid, dialCallStatus, callStatus }).catch((err) =>
      console.error("❌ [Call-Status] Async processing error:", err),
    );

    const voiceResponse = new twiml.VoiceResponse();
    return new Response(voiceResponse.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("❌ [Call-Status] Error handling call status:", error);
    const errResponse = new twiml.VoiceResponse();
    return new Response(errResponse.toString(), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

async function processCallStatus({
  callSid,
  dialCallStatus,
  callStatus,
}: {
  callSid: string;
  dialCallStatus: string;
  callStatus: string;
}) {
  const call = await db.clientCall.findFirst({
    where: { callSid },
    include: {
      client: true,
      company: {
        select: {
          id: true,
          name: true,
          smsGateway: true,
          missedCallTextBackEnabled: true,
        },
      },
    },
  });

  if (!call) {
    console.error("❌ [Call-Status] Call not found for callSid:", callSid);
    return;
  }

  const missedStatuses = ["no-answer", "busy", "failed", "canceled"];
  const isMissedCall =
    dialCallStatus && missedStatuses.includes(dialCallStatus);

  if (isMissedCall && call.client) {
    if (!call.company?.missedCallTextBackEnabled) {
      console.log(
        "⏭️ [Call-Status] Missed call text back disabled, skipping SMS",
      );
    } else {
      const entitlements = await getCompanyEntitlements(call.company.id);
      if (!entitlements.canUseSms || !entitlements.missedCallTextBack) {
        console.log(
          "⏭️ [Call-Status] Missed call text back not in plan, skipping SMS",
        );
      } else {
        try {
          const companyName = call.company?.name || "our business";
          const message = `Sorry we missed your call! Feel free to text this number with what you need in the meantime and we’ll get back to you as soon as possible. - ${companyName}`;

          if (call.company?.smsGateway === "TWILIO") {
            const response = await sendTwilioMessage({
              companyId: call.company?.id,
              clientId: call.client.id,
              message,
              attachments: [],
              systemCall: true,
            });
            if (!response.success) throw new Error(`SMS sending failed`);
            console.log("✅ [Call-Status] Missed call SMS sent via Twilio");
          } else if (call.company?.smsGateway === "INFOBIP") {
            const response = await sendInfobipMessage({
              companyId: call.company?.id,
              clientId: call.client.id,
              message,
              attachments: [],
              systemCall: true,
            });
            if (!response.success) throw new Error(`SMS sending failed`);
            console.log("✅ [Call-Status] Missed call SMS sent via Infobip");
          } else {
            console.warn(
              "⚠️ [Call-Status] No SMS gateway configured for company:",
              call.company?.id,
            );
          }
        } catch (error) {
          console.error(
            "❌ [Call-Status] Failed to send missed call SMS:",
            error,
          );
        }
      }
    }
  }

  const dialStatus = dialCallStatus ?? "";
  let newStatus: string = call.status ?? "ringing";
  if (dialStatus === "answered" || dialStatus === "completed") {
    newStatus = "completed";
  } else if (missedStatuses.includes(dialStatus)) {
    newStatus = "no-answer";
  }

  if (newStatus !== call.status) {
    await db.clientCall.update({
      where: { id: call.id },
      data: { status: newStatus },
    });
    console.log(
      `✅ [Call-Status] Updated call status from ${call.status} to ${newStatus}`,
    );
  }
}
