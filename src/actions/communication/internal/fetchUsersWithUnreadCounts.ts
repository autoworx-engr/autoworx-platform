"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const fetchUsersWithUnreadCounts = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Session ID is required");
    }

    const currentUserId = parseInt(session.user.id);

    const [users, userChatTrack, unreadSenders] = await Promise.all([
      db.user.findMany({
        where: {
          NOT: { id: currentUserId },
          companyId: session.user.companyId,
        },
      }),
      db.chatTrack.findMany({
        where: {
          OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
        include: { message: true },
      }),
      db.chatTrack.findMany({
        where: { receiverId: currentUserId, isRead: false },
        select: { senderId: true },
      }),
    ]);

    const unreadSenderIds = new Set(
      unreadSenders.map((c) => c.senderId).filter((id): id is number => !!id),
    );

    const usersWithUnreadCounts = users.map((user) => ({
      ...user,
      unreadCount: unreadSenderIds.has(user.id) ? 1 : 0,
    }));

    return {
      success: true,
      data: {
        users: usersWithUnreadCounts,
        userChatTrack,
      },
    };
  } catch (error) {
    console.error("Error fetching users with unread counts:", error);
    return {
      success: false,
      error: "Failed to fetch users with unread counts",
    };
  }
};
