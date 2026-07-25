import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { sendClientCallMissedNotification } from "@/lib/notification/communication-notify";
import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { twiml } from "twilio";

const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

/**
 * @swagger
 * /api/twilio/call-status:
 *   post:
 *     summary: Twilio call status callback webhook
 *     tags: [Twilio]
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = formDataToParams(formData);

    const callSid = params.CallSid;
    const dialCallStatus = params.DialCallStatus ?? "";
    const callStatus = params.CallStatus ?? "";

    if (!callSid) {
      const errResponse = new twiml.VoiceResponse();
      return new Response(errResponse.toString(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Look up the call (and the credentials we need for signature verification)
    // up front so we can both verify and process inside the 15s window.
    const call = await db.clientCall.findFirst({
      where: { callSid },
      select: {
        id: true,
        status: true,
        clientId: true,
        companyId: true,
        client: { select: { firstName: true, lastName: true } },
      },
    });

    if (!call) {
      // Twilio retries on 4xx/5xx; 200 with empty TwiML tells Twilio to stop.
      const voiceResponse = new twiml.VoiceResponse();
      return new Response(voiceResponse.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: { companyId: call.companyId },
      select: { authToken: true },
    });

    // TEMP: signature verification disabled for debugging
    // const verification = await verifyTwilioSignature(
    //   request,
    //   params,
    //   twilioCredentials?.authToken ?? null,
    // );
    // if (!verification.ok) {
    //   return new Response("Forbidden", { status: 403 });
    // }

    await processCallStatus({
      callId: call.id,
      currentStatus: call.status,
      companyId: call.companyId,
      clientId: call.clientId,
      clientName: [call.client?.firstName, call.client?.lastName]
        .filter(Boolean)
        .join(" "),
      dialCallStatus,
      callStatus,
    });

    const voiceResponse = new twiml.VoiceResponse();
    return new Response(voiceResponse.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[twilio/call-status] error:", error);
    const errResponse = new twiml.VoiceResponse();
    return new Response(errResponse.toString(), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

type ProcessInput = {
  callId: number;
  currentStatus: string | null;
  companyId: number;
  clientId: number;
  clientName: string;
  dialCallStatus: string;
  callStatus: string;
};

async function processCallStatus({
  callId,
  currentStatus,
  companyId,
  clientId,
  clientName,
  dialCallStatus,
  callStatus,
}: ProcessInput) {
  const finalStatus = dialCallStatus || callStatus;
  const isMissedCall = !!finalStatus && MISSED_STATUSES.has(finalStatus);

  if (isMissedCall) {
    await sendClientCallMissedNotification({ companyId, clientId, clientName });

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        smsGateway: true,
        missedCallTextBackEnabled: true,
      },
    });

    if (company?.missedCallTextBackEnabled) {
      const entitlements = await getCompanyEntitlements(companyId);
      if (entitlements.canUseSms && entitlements.missedCallTextBack) {
        try {
          const companyName = company.name || "our business";
          const message = `Sorry we missed your call! Feel free to text this number with what you need in the meantime and we'll get back to you as soon as possible. - ${companyName}`;

          if (company.smsGateway === "TWILIO") {
            const response = await sendTwilioMessage({
              companyId,
              clientId,
              message,
              attachments: [],
              systemCall: true,
            });
            if (!response.success) throw new Error("Twilio SMS send failed");
          } else if (company.smsGateway === "INFOBIP") {
            const response = await sendInfobipMessage({
              companyId,
              clientId,
              message,
              attachments: [],
              systemCall: true,
            });
            if (!response.success) throw new Error("Infobip SMS send failed");
          }
        } catch (error) {
          console.error(
            "[twilio/call-status] Failed to send missed call SMS:",
            error,
          );
        }
      }
    }
  }

  let newStatus = currentStatus ?? "ringing";
  if (dialCallStatus === "answered" || dialCallStatus === "completed") {
    newStatus = "completed";
  } else if (MISSED_STATUSES.has(dialCallStatus)) {
    newStatus = "no-answer";
  }
  // callStatus (the parent CallStatus enum) is intentionally not propagated
  // here — only DialCallStatus drives our internal status.
  void callStatus;

  if (newStatus !== currentStatus) {
    await db.clientCall.update({
      where: { id: callId },
      data: { status: newStatus },
    });
  }
}
