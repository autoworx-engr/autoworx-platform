import { updateCallChatTrack } from "@/actions/communication/client/chat-track/callTrack";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { sendClientCallMissedNotification } from "@/lib/notification/communication-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { sendMissedCallTextBack } from "@/lib/twilio/missedCallTextBack";
import { NextRequest, NextResponse } from "next/server";

type CallStateAction = "accepted" | "rejected" | "ended";

const ACTION_TO_STATUS: Record<CallStateAction, string> = {
  accepted: "in-progress",
  rejected: "no-answer",
  ended: "completed",
};

// Statuses that mean the call never connected. Mirrors MISSED_STATUSES in
// src/app/api/twilio/call-status/route.ts.
const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

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
  let affectedClientId: number | null = null;

  try {
    // Read before writing so we can tell a genuine transition from a repeat —
    // "ended" arriving after the call was already recorded as missed must not
    // rewrite it to "completed".
    const existing = await db.clientCall.findFirst({
      where: { callSid, companyId },
      select: {
        id: true,
        status: true,
        clientId: true,
        direction: true,
        from: true,
        to: true,
        client: { select: { firstName: true, lastName: true } },
      },
    });

    if (existing) {
      affectedClientId = existing.clientId;
      const wasMissed = MISSED_STATUSES.has(existing.status ?? "");
      const nextStatus =
        wasMissed && action === "ended" ? existing.status! : status;

      if (nextStatus !== existing.status) {
        await db.clientCall.update({
          where: { id: existing.id },
          data: { status: nextStatus },
        });
        recordsUpdated = 1;

        const direction =
          existing.direction === "outbound" ? "outbound" : "inbound";

        // Rejecting a ringing call in the browser or the mobile app never hits
        // the Twilio status callback, so the missed-call notification and
        // text-back have to fire from here too — otherwise whether the client
        // hears back depends on how the agent dismissed the call. Only inbound:
        // a call we placed that went unanswered isn't one we "missed".
        //
        // These run *before* the chat-track write: sending the text-back also
        // stamps the track with the SMS body, so writing the call preview after
        // it is what leaves "Missed call" as the line the client list shows.
        if (
          !wasMissed &&
          MISSED_STATUSES.has(nextStatus) &&
          direction === "inbound"
        ) {
          await sendClientCallMissedNotification({
            companyId,
            clientId: existing.clientId,
            clientName: [existing.client?.firstName, existing.client?.lastName]
              .filter(Boolean)
              .join(" "),
          });
          await sendMissedCallTextBack({
            companyId,
            clientId: existing.clientId,
            call: { from: existing.from, to: existing.to },
          });
        }

        // Every state change bumps the thread so the client floats to the top
        // of the communication hub; a rejected call also marks it unread.
        await updateCallChatTrack({
          clientId: existing.clientId,
          status: nextStatus,
          direction,
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
        // The open phone tab uses this to refresh its call list in place
        // instead of waiting for a manual page reload.
        clientId: affectedClientId,
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
