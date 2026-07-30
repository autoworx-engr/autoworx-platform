"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { getServerSession } from "next-auth";

const pusher = getPusherInstance();

/**
 * Marks the (me, otherUserId) internal chatTrack as read and emits the
 * `chat-track-read` Pusher event so every sidebar (mine + theirs) syncs
 * its badge. Replaces the older `updateChatTrack(chatTrackId)` call path
 * which required the caller to already know the chatTrack id — now the
 * chatTrack is looked up by pair, so the click handler doesn't need a
 * pre-hydrated trace message.
 */
export async function markUserAsRead(otherUserId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { success: false, message: "Unauthorized" };
  }

  const me = parseInt(session.user.id, 10);
  if (!Number.isFinite(me)) {
    return { success: false, message: "Unauthorized" };
  }

  // Counterpart must be in the same company (tenant scope).
  const other = await db.user.findFirst({
    where: { id: otherUserId, companyId: session.user.companyId },
    select: { id: true },
  });
  if (!other) {
    return { success: false, message: "User not found" };
  }

  // Atomic, race-safe: scope by pair + section so a collaboration track
  // can't be mutated through the internal path.
  const result = await db.chatTrack.updateMany({
    where: {
      section: "internal",
      isRead: false,
      OR: [
        { senderId: me, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: me },
      ],
    },
    data: { isRead: true },
  });

  if (result.count > 0) {
    // Notify both parties' sidebars so the read state propagates in real time.
    await Promise.all([
      pusher.trigger(`track-${me}`, "chat-track-read", {
        senderId: otherUserId,
        userId: me,
        section: "internal",
      }),
      pusher.trigger(`track-${otherUserId}`, "chat-track-read", {
        senderId: otherUserId,
        userId: me,
        section: "internal",
      }),
    ]);
  }

  return { success: true };
}
