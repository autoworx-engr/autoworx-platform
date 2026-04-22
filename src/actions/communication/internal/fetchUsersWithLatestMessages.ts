"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const fetchUsersWithLatestMessages = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Session ID is required");
    }

    const currentUserId = parseInt(session.user.id!);

    // Get all users in the company except current user
    const users = await db.user.findMany({
      where: {
        NOT: {
          id: currentUserId,
        },
        companyId: session.user.companyId,
      },
    });

    // Get all messages involving the current user (both sent and received)
    const messages = await db.message.findMany({
      where: {
        OR: [{ from: currentUserId }, { to: currentUserId }],
        // Removed restrictive filters to see all messages
        // { groupId: null }, // Only direct messages, not group messages
        // { section: "internal" }, // Only internal messages
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate unread counts and latest message info per user
    const usersWithLatestMessages = users.map((user) => {
      // Find all messages between current user and this user (including group messages for now)
      const userMessages = messages.filter(
        (message) =>
          (message.from === currentUserId && message.to === user.id) ||
          (message.from === user.id && message.to === currentUserId),
      );

      // Get the latest message
      const latestMessage = userMessages.length > 0 ? userMessages[0] : null;

      // Count unread messages (messages sent to current user that haven't been read)
      const unreadMessages = userMessages.filter(
        (message) => message.to === currentUserId && message.from === user.id,
      );

      // Check if any of these messages are unread via ChatTrack
      const hasUnreadMessage = unreadMessages.some((message) => {
        // We'll check this via a separate query since we need ChatTrack info
        return false; // For now, we'll handle this separately
      });

      return {
        ...user,
        latestMessage,
        unreadCount: hasUnreadMessage ? 1 : 0,
      };
    });

    // Now check for unread status via ChatTrack for users who have messages
    const userChatTracks = await db.chatTrack.findMany({
      where: {
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
      include: {
        message: true,
      },
    });

    // Update unread counts based on ChatTrack data and sort by latest message
    const finalUsersWithLatestMessages = usersWithLatestMessages
      .map((user) => {
        const userChatTrack = userChatTracks.find(
          (track) =>
            (track.senderId === user.id &&
              track.receiverId === currentUserId) ||
            (track.senderId === currentUserId && track.receiverId === user.id),
        );

        // Check if there are unread messages for this user
        const hasUnreadMessage = userChatTracks.some(
          (track) =>
            track.receiverId === currentUserId &&
            track.senderId === user.id &&
            !track.isRead,
        );

        return {
          ...user,
          latestMessage: user.latestMessage,
          unreadCount: hasUnreadMessage ? 1 : 0,
        };
      })
      .sort((a, b) => {
        // Sort by latest message timestamp (most recent first)
        const aTimestamp = a.latestMessage
          ? new Date(a.latestMessage.updatedAt).getTime()
          : 0;
        const bTimestamp = b.latestMessage
          ? new Date(b.latestMessage.updatedAt).getTime()
          : 0;
        return bTimestamp - aTimestamp;
      });

    return {
      success: true,
      data: {
        users: finalUsersWithLatestMessages,
        messages, // All messages for the current user
      },
    };
  } catch (error) {
    console.error("Error fetching users with latest messages:", error);
    return {
      success: false,
      error: "Failed to fetch users with latest messages",
    };
  }
};
