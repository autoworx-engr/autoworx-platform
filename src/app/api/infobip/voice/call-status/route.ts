import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Webhook endpoint for Infobip call status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const callId = body.callId || body.id;
    const status = body.status; // RINGING, ANSWERED, COMPLETED, FAILED, BUSY, NO_ANSWER
    const duration = body.duration;

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Map Infobip status to our status
    const statusMap: Record<string, string> = {
      RINGING: "ringing",
      ANSWERED: "in-progress",
      COMPLETED: "completed",
      FAILED: "failed",
      BUSY: "busy",
      NO_ANSWER: "no-answer",
      CANCELED: "canceled",
    };

    const mappedStatus = statusMap[status] || status.toLowerCase();

    // Update call record
    const updateData: any = { status: mappedStatus };

    if (duration) {
      updateData.duration = duration;
    }

    if (status === "COMPLETED" || status === "FAILED") {
      updateData.endedAt = new Date();
    }

    await db.clientCall.updateMany({
      where: {
        OR: [{ callSid: callId }, { callSid: { contains: callId } }],
      },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating call status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
