import { db } from "@/lib/db";
import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/twilio/call-recording:
 *   post:
 *     summary: Twilio call recording webhook
 *     tags: [Twilio]
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    const formData = await request.formData();
    const params = formDataToParams(formData);

    const callStatus = params.CallStatus ?? "";
    const duration = params.CallDuration;
    const recordingUrl = params.RecordingUrl;

    // Look up the call so we can verify ownership and use the right authToken
    // for signature validation before mutating anything.
    const call = await db.clientCall.findUnique({
      where: { callSid: callId },
      select: { id: true, companyId: true },
    });
    if (!call) {
      return new Response("Call not found", { status: 404 });
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

    // Defensive: only accept recording URLs hosted by Twilio.
    const safeRecordingUrl =
      recordingUrl && /^https:\/\/api\.twilio\.com\//.test(recordingUrl)
        ? recordingUrl
        : undefined;

    try {
      await db.clientCall.update({
        where: { id: call.id },
        data: {
          status: callStatus || undefined,
          duration: duration ? parseInt(duration, 10) : undefined,
          recordingUrl: safeRecordingUrl,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return new Response("Call not found", { status: 404 });
      }
      throw err;
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[twilio/call-recording] error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
