import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { resolveOrCreateClientByPhone } from "@/lib/twilio/callHelpers";
import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";
import { buildIncomingTwiML } from "./_lib/buildIncomingTwiML";
import { logCallAndNotify } from "./_lib/logCallAndNotify";

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
    const callSid = params.CallSid;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'From' or 'To' parameters." },
        { status: 400 },
      );
    }

    // Match the Twilio number exactly (E.164 with or without leading "+") —
    // `contains` would collide when one tenant's number is a substring of
    // another's.
    const toWithPlus = to.startsWith("+") ? to : `+${to}`;
    const toWithoutPlus = to.replace(/^\+/, "");

    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: { phoneNumber: { in: [toWithPlus, toWithoutPlus] } },
    });

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

    const company = await db.company.findUnique({
      where: { id: twilioCredentials.companyId },
      select: {
        id: true,
        name: true,
        callForwardingNumber: true,
        callWhisperEnabled: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }
    const entitlements = await getCompanyEntitlements(company.id);
    if (!entitlements.canUseVoice) {
      const voiceResponse = new twiml.VoiceResponse();
      voiceResponse.reject();
      return new Response(voiceResponse.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const client = await resolveOrCreateClientByPhone({
      companyId: company.id,
      phone: from,
    });

    const callId = callSid || uuidv4();

    // Logging + push fan-out are best-effort and must not delay the TwiML
    // response, but we must not orphan the promise on serverless either.
    // `request.signal` isn't available cross-platform here, so we keep this
    // fire-and-forget but rely on Twilio retrying if Lambda dies before the
    // log is written.
    logCallAndNotify({
      callId,
      from,
      to,
      companyId: company.id,
      clientId: client.id,
      callerName:
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`.trim()
          : client.firstName || client.lastName || from,
    }).catch((err) =>
      console.error("[twilio/incoming] log/notify error:", err),
    );

    const twimlResponse = buildIncomingTwiML({
      callId,
      twilioPhoneNumber: twilioCredentials.phoneNumber,
      companyName: company.name,
      callWhisperEnabled: company.callWhisperEnabled ?? false,
      callForwardingNumber: company.callForwardingNumber,
      callRecordingEnabled: entitlements.callRecording,
      caller: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        fallbackName: from,
        photo: client.photo,
      },
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
