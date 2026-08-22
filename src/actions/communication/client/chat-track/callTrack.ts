import { db } from "@/lib/db";
import { initialCreateClientChatTrack } from ".";

// Twilio statuses that mean the call never connected. Mirrors MISSED_STATUSES
// in src/app/api/twilio/call-status/route.ts.
const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

// Statuses where the call is still happening right now.
const LIVE_STATUSES = new Set(["ringing", "in-progress"]);

// Prefix every call preview carries. The client list keys off it to tell a call
// line apart from a real SMS, since both share the `smsLastMessage` column.
const CALL_PREVIEW_PREFIX = "📞 ";

type CallTrackDirection = "inbound" | "outbound";

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
    if (missed) return `${CALL_PREVIEW_PREFIX}Missed call`;
    if (status === "ringing") return `${CALL_PREVIEW_PREFIX}Incoming call…`;
    if (status === "in-progress") return `${CALL_PREVIEW_PREFIX}On a call…`;
    return `${CALL_PREVIEW_PREFIX}Incoming call`;
  }

  if (missed) return `${CALL_PREVIEW_PREFIX}Outgoing call — no answer`;
  if (LIVE_STATUSES.has(status)) return `${CALL_PREVIEW_PREFIX}Calling…`;
  return `${CALL_PREVIEW_PREFIX}Outgoing call`;
}

/**
 * Bumps a client to the top of the communication-hub list when a call happens.
 *
 * The client list is ordered by `ClientConversationTrack.sendAt` (see
 * `clientSortByUpdatedMessage`), so a call that only writes a `ClientCall` row
 * never reorders the list. Writing the call into the track — the same field SMS
 * uses — makes calls behave like messages: newest activity floats to the top.
 *
 * `callStatus` is written alongside the preview so the list can tell a live
 * call from a finished one. While a call is live the row shows only the call
 * line and highlights; once it ends the email and SMS previews come back.
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
    const isLive = LIVE_STATUSES.has(normalizedStatus);
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
        callStatus: normalizedStatus || null,
        callUpdatedAt: new Date(),
        smsIsRead: !(isMissedInbound || (isLive && direction === "inbound")),
        smsUnReadCount: { increment: isMissedInbound ? 1 : 0 },
      },
    });
  } catch (err) {
    // Call logging must never break the call flow itself.
    console.error("[updateCallChatTrack] failed:", err);
    return null;
  }
}
