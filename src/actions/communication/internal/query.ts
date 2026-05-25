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

export type GroupMessageSender = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};

export const getGroupMessagesPaginated = async (
  groupId: number,
  { pageParam = 1, take = DEFAULT_MESSAGE_TAKE }: PaginatedArgs = {},
) => {
  const skip = Math.max(0, (pageParam - 1) * take);
  const where = { groupId };

  const [rows, total] = await Promise.all([
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

  const senderIds = Array.from(
    new Set(rows.map((m) => m.from).filter((id): id is number => id != null)),
  );
  const senders = senderIds.length
    ? await db.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true, image: true },
      })
    : [];
  const senderById = new Map(senders.map((u) => [u.id, u]));

  const data = rows.map((m) => ({
    ...m,
    sender: m.from != null ? (senderById.get(m.from) ?? null) : null,
  }));

  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
};
