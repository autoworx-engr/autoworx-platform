import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    const formData = await request.formData();
    const callStatus = formData.get("CallStatus") as string;
    const duration = formData.get("CallDuration") as string | null;
    const recordingUrl = formData.get("RecordingUrl") as string | null;

    if (!callId) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Update ClientCall record with status and optional recording
    await db.clientCall.update({
      where: { callSid: callId },
      data: {
        status: callStatus,
        duration: duration ? parseInt(duration) : undefined,
        recordingUrl: recordingUrl || undefined,
      },
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error in Twilio webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
