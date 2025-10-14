import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { twiml } from "twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log("🚀 ~ POST ~ formData:", formData)
    const to = formData.get("To") as string;
    console.log("🚀 ~ POST ~ to:", to)
    //@ts-ignore
    const from = (formData.get("From") ?? "")?.split(":")[1] as string; // Ensure correct retrieval
    console.log("🚀 ~ POST ~ from:", from)

    if (!to || !from) {
      return NextResponse.json(
        { error: "Both 'To' and 'From' parameters are required." },
        { status: 400 }
      );
    }

    // Prevent self-calling
    if (to === from) {
      return NextResponse.json(
        { error: "Cannot call the same Twilio number." },
        { status: 400 }
      );
    }

    let twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        phoneNumber: {
          contains: from.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ twilioCredentials:", twilioCredentials)

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 }
      );
    }

    const client = await db.client.findFirst({
      where: {
        companyId: twilioCredentials?.companyId,
        mobile: {
          contains: to.replace("+", ""),
        },
      },
    });
    console.log("🚀 ~ POST ~ client:", client)

    let callId = uuidv4();
    console.log("🚀 ~ POST ~ callId:", callId)
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
    voiceResponse.dial(
      {
        callerId: twilioCredentials.phoneNumber,
        record: "record-from-answer",
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
        recordingStatusCallbackMethod: "POST",
      },
      to
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
