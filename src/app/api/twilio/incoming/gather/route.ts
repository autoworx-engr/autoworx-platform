import { resolveOrCreateClientByPhone } from "@/lib/twilio/callHelpers";
import { formDataToParams } from "@/lib/twilio/verifyTwilioSignature";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { buildIncomingTwiML } from "../_lib/buildIncomingTwiML";
import { buildGateFailedTwiML } from "../_lib/buildGateTwiML";
import { logCallAndNotify } from "../_lib/logCallAndNotify";
import { resolveTwilioCompanyContext } from "../_lib/resolveTwilioCompanyContext";

/**
 * @swagger
 * /api/twilio/incoming/gather:
 *   post:
 *     summary: Twilio DTMF "human gate" callback — runs the real dial logic
 *       only if the caller pressed 1, otherwise hangs up.
 *     tags: [Twilio]
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = formDataToParams(formData);

    const from = params.From;
    const to = params.To || new URL(request.url).searchParams.get("to") || "";
    const callSid = params.CallSid;
    const digits = params.Digits;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'From' or 'To' parameters." },
        { status: 400 },
      );
    }

    if (digits !== "1") {
      return new Response(buildGateFailedTwiML(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const context = await resolveTwilioCompanyContext(to);
    if (!context) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

    const client = await resolveOrCreateClientByPhone({
      companyId: context.company.id,
      phone: from,
    });

    const callId = callSid || uuidv4();

    // Logging + push fan-out are best-effort and must not delay the TwiML
    // response, but we must not orphan the promise on serverless either.
    logCallAndNotify({
      callId,
      from,
      to,
      companyId: context.company.id,
      clientId: client.id,
      callerName:
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`.trim()
          : client.firstName || client.lastName || from,
    }).catch((err) =>
      console.error("[twilio/incoming/gather] log/notify error:", err),
    );

    const twimlResponse = buildIncomingTwiML({
      callId,
      twilioPhoneNumber: context.twilioCredentials.phoneNumber,
      companyName: context.company.name,
      callWhisperEnabled: context.company.callWhisperEnabled ?? false,
      callForwardingNumber: context.company.callForwardingNumber,
      callRecordingEnabled: context.entitlements.callRecording,
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
    console.error("[twilio/incoming/gather] error:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
