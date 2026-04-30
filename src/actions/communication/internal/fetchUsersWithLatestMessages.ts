"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma, User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { buildUserSearchWhere } from "./_utils/userSearch";

const DEFAULT_TAKE = 30;

type LatestMessageSummary = {
  id: number;
  message: string;
  from: number;
  to: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserWithLatest = User & {
  latestMessage: LatestMessageSummary | null;
  unreadCount: number;
};

export type FetchUsersWithLatestMessagesPage = {
  data: UserWithLatest[];
  total: number;
  nextPage: number | undefined;
  hasMore: boolean;
};

type Params = {
  /** 1-based page number, mirrors useInfinitySmsQuery convention. */
  pageParam?: number;
  take?: number;
  search?: string;
};

/**
 * Paginated users-with-latest-message feed for the internal sidebar.
 *
 * - With no `search`: orders users by the timestamp of their latest direct
 *   message with the current user (NULLS LAST), so active conversations float
 *   to the top and never-messaged users sink to the bottom. Pagination is
 *   pushed entirely into Postgres so the client only receives `take` rows.
 * - With a `search` term: name/email/phone search via the shared
 *   `buildUserSearchWhere` predicate; results ordered by firstName.
 *
 * Returns the same `{ data, total, nextPage, hasMore }` shape that
 * `useInfinitySmsQuery` already consumes so it slots straight into a
 * `useInfiniteQuery` hook.
 */
export async function fetchUsersWithLatestMessages({
  pageParam = 1,
  take = DEFAULT_TAKE,
  search,
}: Params = {}): Promise<FetchUsersWithLatestMessagesPage> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { data: [], total: 0, nextPage: undefined, hasMore: false };
  }

  const currentUserId = parseInt(session.user.id);
  const companyId = session.user.companyId;
  const skip = Math.max(0, (pageParam - 1) * take);
  const trimmed = search?.trim() ?? "";

  // Search branch: simple paginated findMany; ordering by latest message is
  // not the priority when the user is typing a name.
  if (trimmed.length > 0) {
    const where: Prisma.UserWhereInput = {
      companyId,
      NOT: { id: currentUserId },
      ...buildUserSearchWhere(trimmed),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: [{ firstName: "asc" }, { id: "asc" }],
        skip,
        take,
      }),
      db.user.count({ where }),
    ]);

    const hydrated = await hydrateLatestMessages(currentUserId, users);
    const hasMore = skip + users.length < total;

    return {
      data: hydrated,
      total,
      nextPage: hasMore ? pageParam + 1 : undefined,
      hasMore,
    };
  }

  // No search: order users by latest direct message activity at the DB layer.
  // LEFT JOIN against the per-counterpart latest-message subquery so users
  // without any conversations still appear (sorted to the end via NULLS LAST).
  const orderedRows = await db.$queryRaw<
    { id: number; latest_at: Date | null }[]
  >`
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

  const totalRow = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "User"
    WHERE company_id = ${companyId} AND id <> ${currentUserId}
  `;
  const total = Number(totalRow[0]?.count ?? 0);

  const idsInOrder = orderedRows.map((r) => r.id);
  if (idsInOrder.length === 0) {
    return { data: [], total, nextPage: undefined, hasMore: false };
  }

  const usersUnordered = await db.user.findMany({
    where: { id: { in: idsInOrder } },
  });
  const usersById = new Map(usersUnordered.map((u) => [u.id, u]));
  const usersInOrder = idsInOrder
    .map((id) => usersById.get(id))
    .filter((u): u is User => Boolean(u));

  const hydrated = await hydrateLatestMessages(currentUserId, usersInOrder);
  const hasMore = skip + usersInOrder.length < total;

  return {
    data: hydrated,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
}

/**
 * For the given page of users, fetch the single latest direct message between
 * each user and the current user, plus the unread flag from `ChatTrack`.
 * Two batched queries instead of N — never invoked inside a loop.
 */
async function hydrateLatestMessages(
  currentUserId: number,
  users: User[],
): Promise<UserWithLatest[]> {
  if (users.length === 0) return [];
  const otherIds = users.map((u) => u.id);

  // Latest message per counterpart, computed in a single query against the
  // composite (from, to, created_at) lookup pattern.
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

  const chatTracks = await db.chatTrack.findMany({
    where: {
      OR: [
        {
          senderId: { in: otherIds },
          receiverId: currentUserId,
          isRead: false,
        },
        {
          senderId: currentUserId,
          receiverId: { in: otherIds },
          isRead: false,
        },
      ],
    },
    select: { senderId: true, receiverId: true, isRead: true },
  });
  const unreadFromUser = new Set<number>();
  for (const t of chatTracks) {
    if (t.receiverId === currentUserId && t.senderId != null && !t.isRead) {
      unreadFromUser.add(t.senderId);
    }
  }

  return users.map((u) => ({
    ...u,
    latestMessage: latestByCounterpart.get(u.id) ?? null,
    unreadCount: unreadFromUser.has(u.id) ? 1 : 0,
  }));
}
