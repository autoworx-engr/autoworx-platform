"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

export const fetchUsersWithUnreadCounts = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  const currentUserId = parseInt(session.user.id);
  const companyId = session.user.companyId;

  const users = await db.user.findMany({
    where: {
      NOT: { id: currentUserId },
      companyId,
    },
  });

  const userIds = users.map((u) => u.id);
  let unreadByCounterpart = new Map<number, number>();

  if (userIds.length > 0) {
    const unreadRows = await db.$queryRaw<
      { counterpart_id: number; unread_count: bigint }[]
    >`
      SELECT m."from" AS counterpart_id, COUNT(*)::bigint AS unread_count
      FROM "Message" m
      INNER JOIN "ChatTrack" ct
        ON ct.sender_id = m."from"
        AND ct.receiver_id = m."to"
        AND ct.section = 'internal'
        AND ct.is_read = false
      WHERE m."to" = ${currentUserId}
        AND m."from" IN (${Prisma.join(userIds)})
        AND m.group_id IS NULL
      GROUP BY m."from"
    `;
    unreadByCounterpart = new Map(
      unreadRows.map((r) => [r.counterpart_id, Number(r.unread_count)]),
    );
  }

  const userChatTrack = await db.chatTrack.findMany({
    where: {
      OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    },
    include: { message: true },
  });

  const usersWithUnreadCounts = users.map((user) => ({
    ...user,
    unreadCount: unreadByCounterpart.get(user.id) ?? 0,
  }));

  return {
    success: true,
    data: {
      users: usersWithUnreadCounts,
      userChatTrack,
    },
  };
};
