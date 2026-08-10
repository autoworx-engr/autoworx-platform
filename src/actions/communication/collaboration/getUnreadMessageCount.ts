"use server";

import { db } from "@/lib/db";

export default async function getUnreadCollaborationMessageCount(
  userId: number,
) {
  try {
    const grouped = await db.chatTrack.groupBy({
      by: ["senderId"],
      where: {
        receiverId: userId,
        isRead: false,
        section: "collaboration",
      },
      _count: { _all: true },
      _max: { lastMessage: true, createdAt: true },
    });

    return grouped
      .filter((g) => g.senderId !== null)
      .map((g) => ({
        senderId: g.senderId as number,
        count: g._count._all,
        lastMessage: g._max.lastMessage ?? "",
        createdAt: g._max.createdAt ?? new Date(0),
      }));
  } catch {
    return [];
  }
}
