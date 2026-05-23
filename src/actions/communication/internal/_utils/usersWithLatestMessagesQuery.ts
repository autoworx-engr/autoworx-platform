import { db } from "@/lib/db";
import { Prisma, User } from "@prisma/client";

export type LatestMessageSummary = {
  id: number;
  message: string;
  from: number;
  to: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithLatest = User & {
  latestMessage: LatestMessageSummary | null;
  unreadCount: number;
};

/**
 * Returns user ids ordered by latest direct-message activity (NULLS LAST),
 * paginated. LEFT JOIN against the per-counterpart latest-message subquery so
 * users without any conversations still appear (sorted to the end).
 */
export async function fetchUserIdsByLatestMessage(
  currentUserId: number,
  companyId: number,
  skip: number,
  take: number,
) {
  return db.$queryRaw<{ id: number; latest_at: Date | null }[]>`
    SELECT u.id, l.latest_at
    FROM "User" u
    LEFT JOIN (
      SELECT
        CASE WHEN m."from" = ${currentUserId} THEN m."to" ELSE m."from" END AS counterpart_id,
        MAX(m.created_at) AS latest_at
      FROM "Message" m
      WHERE (m."from" = ${currentUserId} OR m."to" = ${currentUserId})
        AND m.group_id IS NULL
        AND CASE WHEN m."from" = ${currentUserId} THEN m."to" ELSE m."from" END IS NOT NULL
      GROUP BY counterpart_id
    ) l ON l.counterpart_id = u.id
    WHERE u.company_id = ${companyId} AND u.id <> ${currentUserId}
    ORDER BY l.latest_at DESC NULLS LAST, u.id ASC
    OFFSET ${skip} LIMIT ${take}
  `;
}

export function countCompanyUsers(
  currentUserId: number,
  companyId: number,
): Promise<number> {
  return db.user.count({
    where: { companyId, NOT: { id: currentUserId } },
  });
}

/**
 * For the given page of users, fetch the single latest direct message between
 * each user and the current user, plus the unread flag from `ChatTrack`. Two
 * batched queries instead of N — never invoked inside a loop.
 */
export async function hydrateLatestMessages(
  currentUserId: number,
  users: User[],
): Promise<UserWithLatest[]> {
  if (users.length === 0) return [];
  const otherIds = users.map((u) => u.id);

  const latestRows = await db.$queryRaw<
    {
      id: number;
      message: string;
      from: number;
      to: number | null;
      created_at: Date;
      updated_at: Date;
      counterpart_id: number;
    }[]
  >`
    SELECT DISTINCT ON (counterpart_id)
      m.id, m.message, m."from", m."to",
      m.created_at, m.updated_at,
      CASE WHEN m."from" = ${currentUserId} THEN m."to" ELSE m."from" END AS counterpart_id
    FROM "Message" m
    WHERE m.group_id IS NULL
      AND (
        (m."from" = ${currentUserId} AND m."to" IN (${Prisma.join(otherIds)}))
        OR (m."to" = ${currentUserId} AND m."from" IN (${Prisma.join(otherIds)}))
      )
    ORDER BY counterpart_id, m.created_at DESC
  `;

  const latestByCounterpart = new Map<number, LatestMessageSummary>();
  for (const r of latestRows) {
    if (r.counterpart_id == null) continue;
    latestByCounterpart.set(r.counterpart_id, {
      id: r.id,
      message: r.message,
      from: r.from,
      to: r.to,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }

  // Real unread count per counterpart. Two cheap Prisma calls:
  //   1. Which counterparts currently have an unread chatTrack with me?
  //   2. For those counterparts only, group + count inbound messages.
  // When the viewer reads (chatTrack.isRead → true), the counterpart drops
  // out of step 1 and the map returns 0 by default.
  const unreadChatTracks = await db.chatTrack.findMany({
    where: {
      receiverId: currentUserId,
      senderId: { in: otherIds },
      section: "internal",
      isRead: false,
    },
    select: { senderId: true },
  });
  const unreadSenderIds = unreadChatTracks
    .map((c) => c.senderId)
    .filter((id): id is number => id !== null);

  const unreadByCounterpart = new Map<number, number>();
  if (unreadSenderIds.length > 0) {
    const counts = await db.message.groupBy({
      by: ["from"],
      where: {
        to: currentUserId,
        from: { in: unreadSenderIds },
        groupId: null,
      },
      _count: { _all: true },
    });
    for (const c of counts) {
      unreadByCounterpart.set(c.from, c._count._all);
    }
  }

  return users.map((u) => ({
    ...u,
    latestMessage: latestByCounterpart.get(u.id) ?? null,
    unreadCount: unreadByCounterpart.get(u.id) ?? 0,
  }));
}
