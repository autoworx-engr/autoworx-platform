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

    // Build a single-pass index of latest message per counterpart user. Messages
    // are already ordered by createdAt desc, so the first hit per counterpart is
    // the latest. Avoids O(n*m) per-user filtering.
    const latestByCounterpart = new Map<number, (typeof messages)[number]>();
    for (const message of messages) {
      const counterpartId =
        message.from === currentUserId ? message.to : message.from;
      if (counterpartId == null) continue;
      if (!latestByCounterpart.has(counterpartId)) {
        latestByCounterpart.set(counterpartId, message);
      }
    }

    const usersWithLatestMessages = users.map((user) => ({
      ...user,
      latestMessage: latestByCounterpart.get(user.id) ?? null,
      unreadCount: 0,
    }));

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
