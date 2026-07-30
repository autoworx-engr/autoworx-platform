"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

const fetchUnreadInternalMessageCount = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const userId = parseInt(session.user.id);
    const baseWhere = {
      to: userId,
      chatTrack: { isRead: false },
    } as const;

    // Two COUNTs instead of `findMany().filter().length` — was loading every
    // unread row across both sections just to count them.
    const [internalCount, collaborationCount] = await Promise.all([
      db.message.count({ where: { ...baseWhere, section: "internal" } }),
      db.message.count({ where: { ...baseWhere, section: "collaboration" } }),
    ]);

    return {
      success: true,
      data: { internalCount, collaborationCount },
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
