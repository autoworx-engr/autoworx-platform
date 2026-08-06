"use server";

import { db } from "@/lib/db";
import { initialCreateClientChatTrack } from ".";

// Twilio statuses that mean the call never connected. Mirrors MISSED_STATUSES
// in src/app/api/twilio/call-status/route.ts.
const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

export type CallTrackDirection = "inbound" | "outbound";

type TUpdateCallChatTrack = {
  clientId: number;
  /** Twilio call status, e.g. "ringing" | "no-answer" | "completed". */
  status: string | null;
  direction: CallTrackDirection;
};

/**
 * Builds the one-line preview the client list shows for a call, matching the
 * "Missed call" / "Incoming call" wording used in the phone tab.
 */
function buildCallPreview(status: string, direction: CallTrackDirection) {
  const missed = MISSED_STATUSES.has(status);

  if (direction === "inbound") {
    if (missed) return "📞 Missed call";
    if (status === "ringing") return "📞 Incoming call";
    return "📞 Incoming call";
  }

  if (missed) return "📞 Outgoing call — no answer";
  return "📞 Outgoing call";
}

/**
 * Bumps a client to the top of the communication-hub list when a call happens.
 *
 * The client list is ordered by `ClientConversationTrack.sendAt` (see
 * `clientSortByUpdatedMessage`), so a call that only writes a `ClientCall` row
 * never reorders the list. Writing the call into the track — the same field SMS
 * uses — makes calls behave like messages: newest activity floats to the top.
 *
 * A missed inbound call also marks the thread unread so it draws attention the
 * way an unread text does.
 */
export async function updateCallChatTrack({
  clientId,
  status,
  direction,
}: TUpdateCallChatTrack) {
  try {
    const normalizedStatus = status ?? "";
    const isMissedInbound =
      direction === "inbound" && MISSED_STATUSES.has(normalizedStatus);
    const preview = buildCallPreview(normalizedStatus, direction);

    // Only an unanswered inbound call counts as unread — outgoing calls and
    // calls we picked up are already "seen" by whoever was on the line.
    const lastMessageBy = direction === "inbound" ? "Client" : "Company";

    const track = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });

    if (!track) {
      await initialCreateClientChatTrack(clientId);
    }

    return await db.clientConversationTrack.update({
      where: { clientId },
      data: {
        smsLastMessage: preview,
        lastMessageBy,
        sendAt: new Date(),
        smsIsRead: !isMissedInbound,
        smsUnReadCount: { increment: isMissedInbound ? 1 : 0 },
      },
    });
  } catch (err) {
    // Call logging must never break the call flow itself.
    console.error("[updateCallChatTrack] failed:", err);
    return null;
  }
}
