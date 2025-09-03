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

    const users = await db.user.findMany({
      where: {
        NOT: {
          id: parseInt(session?.user?.id),
        },
        companyId: session?.user?.companyId,
      },
    });

    const userChatTrack = await db.chatTrack.findMany({
      where: {
        OR: [
          { senderId: parseInt(session?.user?.id!) },
          { receiverId: parseInt(session?.user?.id!) },
        ],
      },
      include: {
        message: true,
      },
    });

    // Calculate simple unread indicator per user (0 or 1)
    const usersWithUnreadCounts = users.map(user => {
      const hasUnreadMessage = userChatTrack.some(chat => 
        chat.receiverId === parseInt(session?.user?.id!) && 
        chat.senderId === user.id && 
        !chat.isRead
      );
      
      return {
        ...user,
        unreadCount: hasUnreadMessage ? 1 : 0
      };
    });

    return {
      success: true,
      data: {
        users: usersWithUnreadCounts,
        userChatTrack
      }
    };
  } catch (error) {
    console.error("Error fetching users with unread counts:", error);
    return {
      success: false,
      error: "Failed to fetch users with unread counts"
    };
  }
};
