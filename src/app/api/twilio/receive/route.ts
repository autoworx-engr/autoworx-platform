import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               To:
 *                 type: string
 *               From:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call received
 *       400:
 *         description: Missing parameters
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log("🚀 ~ POST ~ formData:", formData);
    const to = formData.get("To") as string;
    console.log("🚀 ~ POST ~ to:", to);
    //@ts-ignore
    const from = (formData.get("From") ?? "")?.split(":")[1] as string; // Ensure correct retrieval
    console.log("🚀 ~ POST ~ from:", from);

    if (!to || !from) {
      return NextResponse.json(
        { error: "Both 'To' and 'From' parameters are required." },
        { status: 400 },
      );
    }

    // Prevent self-calling
    if (to === from) {
      return NextResponse.json(
        { error: "Cannot call the same Twilio number." },
        { status: 400 },
      );
    }

    let twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        phoneNumber: {
          contains: from.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ twilioCredentials:", twilioCredentials);

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

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

    const client = await db.client.findFirst({
      where: {
        companyId: twilioCredentials?.companyId,
        mobile: {
          contains: to.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ client:", client);

    let callId = uuidv4();
    console.log("🚀 ~ POST ~ callId:", callId);
    // Prepare database insert for ClientCall
    await db.clientCall.create({
      data: {
        callSid: callId, // temporary; real SID will be updated on callback
        from,
        to,
        status: "initiated",
        direction: "outbound",
        sentBy: "Company", // or derive from context/session
        companyId: twilioCredentials.companyId,
        clientId: client?.id!,
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
    });
    // Whisper URL notifies the called party (client) that the call is being recorded
    // before bridging them to the agent. companyId lets the whisper endpoint look up
    // the company name and check if whisper is enabled.
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
    console.error("Error handling the Twilio request:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
