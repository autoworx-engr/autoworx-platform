import { updateCallChatTrack } from "@/actions/communication/client/chat-track/callTrack";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/infobip/voice/call-status:
 *   post:
 *     summary: Infobip call status webhook
 *     tags: [Infobip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callId:
 *                 type: string
 *               status:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Missing callId
 *       500:
 *         description: Server error
 */
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

    // Bump the thread so a missed call surfaces at the top of the client list.
    const call = await db.clientCall.findFirst({
      where: {
        OR: [{ callSid: callId }, { callSid: { contains: callId } }],
      },
      select: { clientId: true, direction: true },
    });

    if (call?.clientId) {
      await updateCallChatTrack({
        clientId: call.clientId,
        status: mappedStatus,
        direction: call.direction === "outbound" ? "outbound" : "inbound",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating call status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
