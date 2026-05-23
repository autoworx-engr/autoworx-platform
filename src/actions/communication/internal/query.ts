"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { planObject } from "@/utils/planObject";

export const getGroupById = async (groupId: number, userId: number) => {
  const group = await db.group.findUnique({
    where: {
      id: groupId,
      users: { some: { id: userId } },
    },
    include: {
      users: true,
    },
  });
  return planObject(group);
};

/**
 * Legacy: returns every message where the given user is sender or recipient.
 * Callers (currently collaboration) filter the result client-side. New code
 * should call {@link getUserMessagesByPair} which scopes both ends in SQL and
 * supports pagination.
 */
export const getUserMessagesById = async (userId: number) => {
  const messages = await db.message.findMany({
    where: {
      AND: [{ OR: [{ from: userId }, { to: userId }] }, { groupId: null }],
    },
    include: {
      attachment: true,
      requestEstimate: true,
    },
  });
  return messages;
};

export const getUserInGroup = async (userId: number, groupId: number) => {
  const isUserInExistGroup = await db.group.findFirst({
    where: {
      id: groupId,
      users: {
        some: {
          id: userId,
        },
      },
    },
  });
  if (!isUserInExistGroup) {
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Paginated variants used by the internal chat hooks (`useInfiniteUserMessages`
// and `useInfiniteGroupMessages`). Both return the same `{ data, total,
// nextPage, hasMore }` shape consumed by `useInfinitySmsQuery` so the
// react-query wiring is identical.
// ---------------------------------------------------------------------------

const DEFAULT_MESSAGE_TAKE = 20;

export type PaginatedMessagesPage<T> = {
  data: T[];
  total: number;
  nextPage: number | undefined;
  hasMore: boolean;
};

type PaginatedArgs = {
  pageParam?: number;
  take?: number;
};

/**
 * Direct-message thread between exactly two users, newest first, paginated.
 * Tightens the where clause from `(from = me OR to = me)` (which the legacy
 * helper used and forced JS-side filtering) to `((from=me AND to=other) OR
 * (from=other AND to=me))` so the DB returns only the relevant pair.
 */
export const getUserMessagesByPair = async (
  currentUserId: number,
  otherUserId: number,
  { pageParam = 1, take = DEFAULT_MESSAGE_TAKE }: PaginatedArgs = {},
) => {
  const skip = Math.max(0, (pageParam - 1) * take);

  const where: Prisma.MessageWhereInput = {
    groupId: null,
    OR: [
      { from: currentUserId, to: otherUserId },
      { from: otherUserId, to: currentUserId },
    ],
  };

  const [data, total] = await Promise.all([
    db.message.findMany({
      where,
      include: {
        attachment: true,
        requestEstimate: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.message.count({ where }),
  ]);

  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
};

/**
 * Paginated group thread, newest first. Group existence + membership is
 * still verified by the existing `getUserInGroup` helper from the caller —
 * not folded in here so this function stays a pure data fetch.
 */
export const getGroupMessagesPaginated = async (
  groupId: number,
  { pageParam = 1, take = DEFAULT_MESSAGE_TAKE }: PaginatedArgs = {},
) => {
  const skip = Math.max(0, (pageParam - 1) * take);
  const where = { groupId };

  const [data, total] = await Promise.all([
    db.message.findMany({
      where,
      select: {
        id: true,
        groupId: true,
        from: true,
        message: true,
        createdAt: true,
        attachment: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.message.count({ where }),
  ]);

  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
};
