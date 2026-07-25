import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import {
  findTwilioCredentialsByNumber,
  resolveOrCreateClientByPhone,
} from "@/lib/twilio/callHelpers";
import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";

type DialAttributes = Parameters<twiml.VoiceResponse["dial"]>[0];

/**
 * @swagger
 * /api/twilio/receive:
 *   post:
 *     summary: Twilio outgoing call receive endpoint
 *     tags: [Twilio]
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = formDataToParams(formData);

    const to = params.To;
    const fromRaw = params.From;
    const from = fromRaw ? (fromRaw.split(":")[1] ?? "") : "";

    if (!to || !from) {
      return NextResponse.json(
        { error: "Both 'To' and 'From' parameters are required." },
        { status: 400 },
      );
    }

    if (to === from) {
      return NextResponse.json(
        { error: "Cannot call the same Twilio number." },
        { status: 400 },
      );
    }

    const twilioCredentials = await findTwilioCredentialsByNumber(from);
    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

    // TEMP: signature verification disabled for debugging
    // const verification = await verifyTwilioSignature(
    //   request,
    //   params,
    //   twilioCredentials.authToken,
    // );
    // if (!verification.ok) {
    //   return new Response("Forbidden", { status: 403 });
    // }

    const entitlements = await getCompanyEntitlements(
      twilioCredentials.companyId,
    );

    if (!entitlements.canUseVoice) {
      const voiceResponse = new twiml.VoiceResponse();
      voiceResponse.reject();
      return new Response(voiceResponse.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const client = await resolveOrCreateClientByPhone({
      companyId: twilioCredentials.companyId,
      phone: to,
    });

    const callId = uuidv4();
    await db.clientCall.create({
      data: {
        callSid: callId,
        from,
        to,
        status: "initiated",
        direction: "outbound",
        sentBy: "Company",
        companyId: twilioCredentials.companyId,
        clientId: client.id,
      },
    });

    const voiceResponse = new twiml.VoiceResponse();
    const recordingOptions: Partial<DialAttributes> = entitlements.callRecording
      ? {
          record: "record-from-answer" as const,
          recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
          recordingStatusCallbackMethod: "POST",
        }
      : {};

    const dial = voiceResponse.dial({
      callerId: twilioCredentials.phoneNumber,
      ...recordingOptions,
      // Required for whisper: caller keeps hearing ringing while the whisper
      // message plays to the callee; call is only bridged after whisper finishes.
      answerOnBridge: true,
      // Force Twilio to play a ringback tone to the caller while the dialed
      // PSTN number rings. Without this, the WebRTC/mobile caller leg often
      // gets no early media on outbound calls to regular numbers → silence.
      ringTone: "us",
    });
    dial.number(
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/whisper?companyId=${twilioCredentials.companyId}`,
      },
      to,
    );

    return new Response(voiceResponse.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[twilio/receive] error:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
