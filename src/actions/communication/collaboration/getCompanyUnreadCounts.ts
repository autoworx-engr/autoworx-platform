"use server";

import { db } from "@/lib/db";

export async function getCompanyUnreadCounts(
  currentCompanyId: number,
  senderCompanyId: number,
) {
  try {
    const tracks = await db.companyChatTrack.findMany({
      where: {
        receiverCompanyId: currentCompanyId,
        senderCompanyId: senderCompanyId,
        isRead: false,
      },
      select: {
        senderCompanyId: true,
      },
    });

    return {
      companyId: senderCompanyId,
      count: tracks.length,
    };
  } catch (error) {
    console.error("Unread count error:", error);
    return {
      companyId: senderCompanyId,
      count: 0,
    };
  }
}
