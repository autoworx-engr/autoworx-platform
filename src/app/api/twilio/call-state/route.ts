import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const MISSED_CALL_SMS = "You missed a call from this number. Call to respond.";

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
    if (action === "rejected") {
      // Use a transaction so the SMS log + chat track are consistent with the
      // status flip and only run when there really is a matching call.
      const result = await db.$transaction(async (tx) => {
        const update = await tx.clientCall.updateMany({
          where: { callSid, companyId },
          data: { status },
        });
        if (update.count === 0) return { count: 0, call: null as null };

        const call = await tx.clientCall.findFirst({
          where: { callSid, companyId },
          select: { id: true, clientId: true, from: true, to: true },
        });
        if (!call) return { count: update.count, call: null };

        await tx.clientSMS.create({
          data: {
            from: call.from,
            to: call.to,
            message: MISSED_CALL_SMS,
            sentBy: "Client",
            clientId: call.clientId,
            companyId,
          },
        });

        return { count: update.count, call };
      });

      recordsUpdated = result.count;

      if (result.call?.clientId) {
        await updateNewSMSChatTrack({
          clientId: result.call.clientId,
          smsLastMessage: MISSED_CALL_SMS,
          lastMessageBy: "Client",
          attachments: [],
        });
      }
    } else {
      const update = await db.clientCall.updateMany({
        where: { callSid, companyId },
        data: { status },
      });
      recordsUpdated = update.count;
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
