"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

const fetchUnreadInternalMessageCount = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Session ID is required");
    }
    const message =
      (await db.message.findMany({
        where: {
          to: parseInt(session?.user?.id!),
          chatTrack: {
            isRead: false,
          },
        },
      })) || [];

    const unreadCount = {
      collaborationCount: message.filter(
        (message) => message.section === "collaboration",
      ).length,
      internalCount: message.filter((message) => message.section === "internal")
        .length,
    };

    return {
      success: true,
      data: unreadCount,
      message: "Unread message count fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch unread message count",
    };
  }
};

export default fetchUnreadInternalMessageCount;
