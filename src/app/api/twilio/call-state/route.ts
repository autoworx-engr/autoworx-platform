import { updateCallChatTrack } from "@/actions/communication/client/chat-track/callTrack";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

type CallStateAction = "accepted" | "rejected" | "ended";

const ACTION_TO_STATUS: Record<CallStateAction, string> = {
  accepted: "in-progress",
  rejected: "no-answer",
  ended: "completed",
};

const ACTION_TO_EVENT: Record<CallStateAction, string> = {
  accepted: "call-accepted",
  rejected: "call-rejected",
  ended: "call-ended",
};

/**
 * @swagger
 * /api/twilio/call-state:
 *   post:
 *     summary: Update Twilio call state
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 */
export async function POST(request: NextRequest) {
  const principal = await getAuthPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companyId = principal.companyId;

  const body = (await request.json().catch(() => ({}))) as {
    callSid?: unknown;
    action?: unknown;
    deviceId?: unknown;
  };

  const callSid = typeof body.callSid === "string" ? body.callSid : "";
  const action =
    body.action === "accepted" ||
    body.action === "rejected" ||
    body.action === "ended"
      ? (body.action as CallStateAction)
      : null;
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId : undefined;

  if (!callSid || !action) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  const status = ACTION_TO_STATUS[action];

  let recordsUpdated = 0;
  let dbError = false;

  try {
    const update = await db.clientCall.updateMany({
      where: { callSid, companyId },
      data: { status },
    });
    recordsUpdated = update.count;

    if (recordsUpdated > 0) {
      const call = await db.clientCall.findFirst({
        where: { callSid, companyId },
        select: { clientId: true, direction: true },
      });

      // Every state change bumps the thread so the client floats to the top of
      // the communication hub; a rejected call also marks it unread.
      if (call?.clientId) {
        await updateCallChatTrack({
          clientId: call.clientId,
          status,
          direction: call.direction === "outbound" ? "outbound" : "inbound",
        });
      }
    }
  } catch (err) {
    console.error("[call-state] Database update error:", err);
    dbError = true;
  }

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to update call state" },
      { status: 500 },
    );
  }

  try {
    await getPusherInstance().trigger(
      `company-${companyId}`,
      ACTION_TO_EVENT[action],
      {
        callSid,
        action,
        deviceId,
        timestamp: new Date().toISOString(),
      },
    );
  } catch (pusherError) {
    console.error("[call-state] Pusher broadcast error:", pusherError);
    return NextResponse.json({
      success: true,
      recordsUpdated,
      pusherError: "Failed to broadcast",
    });
  }

  return NextResponse.json({ success: true, recordsUpdated });
}
