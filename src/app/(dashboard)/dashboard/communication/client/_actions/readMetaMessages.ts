"use server";

import { db } from "@/lib/db";

/**
 * Marks all Meta messages for a client as read.
 *
 * Sets `metaIsRead = true` and `metaUnReadCount = 0` on the client's
 * `ClientConversationTrack` row. Returns the updated row, or `null` if no
 * track exists yet. Short-circuits if already fully read to avoid a
 * pointless write.
 *
 * Called by `MetaContainer` on mount so the unread badge clears when the
 * user opens the conversation.
 *
 * @param clientId - The client whose Meta messages to mark as read
 */
export async function readMetaMessages(clientId: number) {
  const existing = await db.clientConversationTrack.findUnique({
    where: { clientId },
  });
  if (!existing) return null;
  if (existing.metaUnReadCount === 0 && existing.metaIsRead) return existing;
  return db.clientConversationTrack.update({
    where: { clientId },
    data: { metaIsRead: true, metaUnReadCount: 0 },
  });
}
