import { updateCallChatTrack } from "@/actions/communication/client/chat-track/callTrack";
import { db } from "@/lib/db";
import { sendClientCallMissedNotification } from "@/lib/notification/communication-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { sendMissedCallTextBack } from "@/lib/twilio/missedCallTextBack";
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

    const { searchParams } = new URL(request.url);
    const callSid = searchParams.get("callId") || params.CallSid;
    const dialCallStatus = params.DialCallStatus ?? "";
    const callStatus = params.CallStatus ?? "";

    if (!callSid) {
      const errResponse = new twiml.VoiceResponse();
      return new Response(errResponse.toString(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const call = await db.clientCall.findFirst({
      where: { callSid },
      select: {
        id: true,
        status: true,
        direction: true,
        from: true,
        to: true,
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

    await processCallStatus({
      callId: call.id,
      currentStatus: call.status,
      direction: call.direction === "outbound" ? "outbound" : "inbound",
      companyId: call.companyId,
      clientId: call.clientId,
      clientName: [call.client?.firstName, call.client?.lastName]
        .filter(Boolean)
        .join(" "),
      from: call.from,
      to: call.to,
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
  direction: "inbound" | "outbound";
  companyId: number;
  clientId: number;
  clientName: string;
  from: string;
  to: string;
  dialCallStatus: string;
  callStatus: string;
};

async function processCallStatus({
  callId,
  currentStatus,
  direction,
  companyId,
  clientId,
  clientName,
  from,
  to,
  dialCallStatus,
  callStatus,
}: ProcessInput) {
  const finalStatus = dialCallStatus || callStatus;
  const isMissedCall = !!finalStatus && MISSED_STATUSES.has(finalStatus);

  const alreadyMissed = MISSED_STATUSES.has(currentStatus ?? "");

  if (isMissedCall && !alreadyMissed && direction === "inbound") {
    await sendClientCallMissedNotification({ companyId, clientId, clientName });
    await sendMissedCallTextBack({ companyId, clientId, call: { from, to } });
  }

  let newStatus = currentStatus ?? "ringing";
  if (dialCallStatus === "answered" || dialCallStatus === "completed") {
    newStatus = "completed";
  } else if (MISSED_STATUSES.has(dialCallStatus)) {
    newStatus = "no-answer";
  } else if (!dialCallStatus) {
    if (MISSED_STATUSES.has(callStatus)) {
      newStatus = "no-answer";
    } else if (callStatus === "completed") {
      // Parent completed with no bridged leg — nobody ever picked up.
      newStatus = currentStatus === "in-progress" ? "completed" : "no-answer";
    }
  }

  if (newStatus !== currentStatus) {
    await db.clientCall.update({
      where: { id: callId },
      data: { status: newStatus },
    });
    await updateCallChatTrack({ clientId, status: newStatus, direction });

    try {
      await getPusherInstance().trigger(
        `company-${companyId}`,
        "call-status-updated",
        { clientId, status: newStatus, timestamp: new Date().toISOString() },
      );
    } catch (pusherError) {
      console.error(
        "[twilio/call-status] Pusher broadcast error:",
        pusherError,
      );
    }
  }
}
