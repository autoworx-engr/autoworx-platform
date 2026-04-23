"use server";
import { db } from "@/lib/db";

export default async function getUnreadCollaborationMessageCount(
  userId: number,
) {
  try {
    const unreadMessages = await db.chatTrack.findMany({
      where: {
        AND: [
          {
            receiverId: userId,
          },
          {
            isRead: false,
          },
          {
            section: "collaboration",
          },
        ],
      },
    });

    // Group by sender to get unread count per user/company
    const unreadBySender = unreadMessages.reduce(
      (acc, track) => {
        const senderId = track.senderId || 0;
        if (!acc[senderId]) {
          acc[senderId] = {
            count: 0,
            lastMessage: track.lastMessage,
            createdAt: track.createdAt,
            senderId,
          };
        }
        acc[senderId].count += 1;
        // Keep the most recent message
        if (track.createdAt > acc[senderId].createdAt) {
          acc[senderId].lastMessage = track.lastMessage;
          acc[senderId].createdAt = track.createdAt;
        }
        return acc;
      },
      {} as Record<
        number,
        {
          count: number;
          lastMessage: string;
          createdAt: Date;
          senderId: number;
        }
      >,
    );

    return Object.values(unreadBySender);
  } catch (err) {
    console.error("Error fetching unread collaboration message count:", err);
    return [];
  }
}
