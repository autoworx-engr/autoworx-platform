import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { buildGateTwiML } from "./_lib/buildGateTwiML";
import { resolveTwilioCompanyContext } from "./_lib/resolveTwilioCompanyContext";

/**
 * @swagger
 * /api/twilio/incoming:
 *   post:
 *     summary: Twilio incoming call webhook
 *     tags: [Twilio]
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = formDataToParams(formData);

    const from = params.From; // Caller's phone number
    const to = params.To; // Your Twilio number

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'From' or 'To' parameters." },
        { status: 400 },
      );
    }

    const context = await resolveTwilioCompanyContext(to);
    if (!context) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

    // TEMP: signature verification disabled for debugging
    // const verification = await verifyTwilioSignature(
    //   request,
    //   params,
    //   context.twilioCredentials.authToken,
    // );
    // if (!verification.ok) {
    //   return new Response("Forbidden", { status: 403 });
    // }

    if (!context.entitlements.canUseVoice) {
      const voiceResponse = new twiml.VoiceResponse();
      voiceResponse.reject();
      return new Response(voiceResponse.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // DTMF "human gate" before we resolve the client, log the call, or ring
    // anyone — most robocall/bot traffic never presses a key, so this keeps
    // spam calls from generating notifications at all. The real dial logic
    // (client resolution, logging, buildIncomingTwiML) runs in
    // /api/twilio/incoming/gather once the caller passes the gate.
    const twimlResponse = buildGateTwiML({
      companyName: context.company.name,
      callWhisperEnabled: context.company.callWhisperEnabled ?? false,
      to,
    });

    return new Response(twimlResponse, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[twilio/incoming] error:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
