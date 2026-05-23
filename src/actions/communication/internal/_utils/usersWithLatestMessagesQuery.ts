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

export async function countCompanyUsers(
  currentUserId: number,
  companyId: number,
): Promise<number> {
  const totalRow = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "User"
    WHERE company_id = ${companyId} AND id <> ${currentUserId}
  `;
  return Number(totalRow[0]?.count ?? 0);
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

  // Real unread count: number of inbound messages from each counterpart
  // whose pair-level chatTrack is currently unread. When the viewer marks
  // the conversation read (chatTrack.isRead → true), every counterpart's
  // count collapses to 0; an incoming Pusher message increments it client-side.
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
      AND m."from" IN (${Prisma.join(otherIds)})
      AND m.group_id IS NULL
    GROUP BY m."from"
  `;
  const unreadByCounterpart = new Map<number, number>();
  for (const r of unreadRows) {
    unreadByCounterpart.set(r.counterpart_id, Number(r.unread_count));
  }

  return users.map((u) => ({
    ...u,
    latestMessage: latestByCounterpart.get(u.id) ?? null,
    unreadCount: unreadByCounterpart.get(u.id) ?? 0,
  }));
}
