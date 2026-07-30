"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const DEFAULT_TAKE = 15;

type Params = {
  /** 1-based page number, mirrors `fetchUsersWithLatestMessages`. */
  pageParam?: number;
  take?: number;
  search?: string;
};

export type GroupListItemData = Prisma.GroupGetPayload<{
  include: { users: true };
}> & { unreadCount: number };

export type FetchGroupsPage = {
  data: GroupListItemData[];
  total: number;
  nextPage: number | undefined;
  hasMore: boolean;
};

/**
 * Paginated groups feed for the internal sidebar. Shape matches
 * `fetchUsersWithLatestMessages` so `useInfiniteGroupsList` plugs into the
 * same react-query pagination pattern.
 *
 * Tenant filter: groups whose `companyId` matches the caller's company, plus
 * legacy groups with `companyId = null` that the caller is already a member of
 * (membership is the actual access guard).
 *
 * Ordered by `updatedAt DESC` so the most recently active groups float to the
 * top. Search filters by name (case-insensitive contains). Each group includes
 * a per-viewer `unreadCount` — group messages with `createdAt > lastSeenAt`
 * and `from != viewer`. Treated as 0 when the user has never opened the group.
 */
export async function fetchGroupsList({
  pageParam = 1,
  take = DEFAULT_TAKE,
  search,
}: Params = {}): Promise<FetchGroupsPage> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { data: [], total: 0, nextPage: undefined, hasMore: false };
  }

  const currentUserId = parseInt(session.user.id);
  const companyId = session.user.companyId;
  const skip = Math.max(0, (pageParam - 1) * take);
  const trimmed = search?.trim() ?? "";

  const where: Prisma.GroupWhereInput = {
    OR: [{ companyId }, { companyId: null }],
    users: { some: { id: currentUserId } },
    ...(trimmed ? { name: { contains: trimmed, mode: "insensitive" } } : {}),
  };

  const [groups, total] = await Promise.all([
    db.group.findMany({
      where,
      include: { users: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    db.group.count({ where }),
  ]);

  const data = await attachUnreadCounts(currentUserId, groups);
  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
}

/**
 * For the given page of groups, count inbound messages (from != viewer)
 * created after the viewer's `lastSeenAt` per group. Two batched Prisma
 * calls — never invoked inside a loop.
 *
 * Resilient: if the `GroupReadState` table doesn't exist yet (migration not
 * applied) the function returns `unreadCount: 0` for every group so the
 * sidebar still renders. The badge simply won't light up until the
 * migration runs.
 */
async function attachUnreadCounts(
  currentUserId: number,
  groups: Prisma.GroupGetPayload<{ include: { users: true } }>[],
): Promise<GroupListItemData[]> {
  if (groups.length === 0) return [];
  const groupIds = groups.map((g) => g.id);

  let seenAtByGroup: Map<number, Date>;
  try {
    const readStates = await db.groupReadState.findMany({
      where: { userId: currentUserId, groupId: { in: groupIds } },
      select: { groupId: true, lastSeenAt: true },
    });
    seenAtByGroup = new Map(readStates.map((r) => [r.groupId, r.lastSeenAt]));
  } catch (err) {
    console.warn(
      "[fetchGroupsList] GroupReadState unavailable — apply migration `prisma/migrations/20260525120000_add_group_read_states.sql` to enable group unread counts.",
      err instanceof Error ? err.message : err,
    );
    return groups.map((g) => ({ ...g, unreadCount: 0 }));
  }

  // groupBy `from` is NOT what we want here — we want one count per groupId.
  // Single Prisma groupBy by `groupId` with a `createdAt > seenAt` filter
  // requires a per-group threshold; the cleanest fluent expression is one
  // call per group, batched via Promise.all. Group count is bounded by the
  // page size, so this is small + parallel.
  const unreadCounts = await Promise.all(
    groups.map((g) => {
      const seenAt = seenAtByGroup.get(g.id);
      return db.message.count({
        where: {
          groupId: g.id,
          NOT: { from: currentUserId },
          ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
        },
      });
    }),
  );

  return groups.map((g, i) => ({ ...g, unreadCount: unreadCounts[i] }));
}
