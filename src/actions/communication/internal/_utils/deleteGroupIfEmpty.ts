import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Counts the group's remaining members and, if zero, deletes the group along
 * with its messages and their attachments. The deletion is a single
 * transaction so we never leave dangling FK rows.
 *
 * `Message → Group`, `Attachment → Message`, and `ChatTrack → Message` are all
 * configured WITHOUT `onDelete: Cascade` in schema.prisma, so the cleanup
 * order has to be explicit:
 *   1. Null out chatTrack rows that reference a group message (defensive — in
 *      practice chatTracks are direct-only, but the FK would still block).
 *   2. Delete attachments by messageId.
 *   3. Delete messages by groupId.
 *   4. Delete the group itself.
 *
 * Returns true when the group was deleted, false when members remain.
 *
 * Callers may pass an existing transaction client (e.g. when this runs inside
 * a larger atomic operation).
 */
export async function deleteGroupIfEmpty(
  groupId: number,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<boolean> {
  const remaining = await tx.group.findUnique({
    where: { id: groupId },
    select: { _count: { select: { users: true } } },
  });
  if (!remaining || remaining._count.users > 0) return false;

  const messages = await tx.message.findMany({
    where: { groupId },
    select: { id: true },
  });
  const messageIds = messages.map((m) => m.id);

  if (messageIds.length > 0) {
    await tx.chatTrack.updateMany({
      where: { messageId: { in: messageIds } },
      data: { messageId: null },
    });
    await tx.attachment.deleteMany({
      where: { messageId: { in: messageIds } },
    });
    await tx.message.deleteMany({ where: { groupId } });
  }

  await tx.group.delete({ where: { id: groupId } });
  return true;
}
