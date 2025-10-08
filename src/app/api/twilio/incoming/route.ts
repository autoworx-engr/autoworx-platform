import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log("🚀 ~ POST ~ formData:", formData);
    const from = formData.get("From") as string; // Caller's phone number
    console.log("🚀 ~ POST ~ from:", from);
    const to = formData.get("To") as string; // Your Twilio number
    console.log("🚀 ~ POST ~ to:", to);
    const callSid = formData.get("CallSid") as string;
    console.log("🚀 ~ POST ~ callSid:", callSid);

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'From' or 'To' parameters." },
        { status: 400 }
      );
    }

    // Find the Twilio credentials for this phone number
    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        phoneNumber: {
          contains: to.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ twilioCredentials:", twilioCredentials);

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 }
      );
    }

    // Try to find the client
    let client = await db.client.findFirst({
      where: {
        companyId: twilioCredentials?.companyId,
        mobile: {
          contains: from.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ client:", client);

    // If client doesn't exist, create a new one
    if (!client) {
      client = await db.client.create({
        data: {
          firstName: "Unknown",
          lastName: "Caller",
          mobile: from,
          companyId: twilioCredentials.companyId,
        },
      });
    }

    const callId = callSid || uuidv4();
    console.log("🚀 ~ POST ~ callId:", callId);

    // Create ClientCall record for incoming call
    await db.clientCall.create({
      data: {
        callSid: callId,
        from,
        to,
        status: "ringing",
        direction: "inbound",
        sentBy: "Client",
        companyId: twilioCredentials.companyId,
        clientId: client.id,
      },
    });

    // Generate TwiML to dial the user's browser/device
    const voiceResponse = new twiml.VoiceResponse();
    console.log("🚀 ~ POST ~ voiceResponse:", voiceResponse);

    // Dial to the client identity (the browser device)
    const dial = voiceResponse.dial({
      record: "record-from-answer",
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
      recordingStatusCallbackMethod: "POST",
    });

    // Connect to the user's device
    // IMPORTANT: The identity here must match what was used when creating the token
    // If you have multiple users, you need to determine which device to ring
    // For now, using the Twilio phone number as the identity
    const clientIdentity = twilioCredentials.phoneNumber;
    console.log("� Dialing to client identity:", clientIdentity);
    dial.client(clientIdentity);

    const twimlResponse = voiceResponse.toString();
    console.log("🚀 ~ TwiML Response:", twimlResponse);

    return new Response(twimlResponse, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error handling incoming call:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
