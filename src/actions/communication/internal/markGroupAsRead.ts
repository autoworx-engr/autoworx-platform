"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

/**
 * Marks the given group as "seen up to now" for the current user. Upserts a
 * `GroupReadState` row keyed on `(userId, groupId)` with `lastSeenAt = now`.
 * Called when the viewer opens a group chat — subsequent group messages whose
 * `createdAt` is after this timestamp count as unread.
 */
export async function markGroupAsRead(groupId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return { success: false, message: "Unauthorized" };
  }

  // Verify caller is actually in the group (membership = authorization).
  const membership = await db.group.findFirst({
    where: { id: groupId, users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!membership) {
    return { success: false, message: "Group not found" };
  }

  const now = new Date();
  await db.groupReadState.upsert({
    where: { userId_groupId: { userId, groupId } },
    create: { userId, groupId, lastSeenAt: now },
    update: { lastSeenAt: now },
  });

  return { success: true };
}
