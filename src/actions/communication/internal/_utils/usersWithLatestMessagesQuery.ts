import { db } from "@/lib/db";
import { User } from "@prisma/client";

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
 * Returns user ids in the order they should appear in the sidebar: most
 * recently active conversation first, never-chatted users at the bottom,
 * ties broken by id ASC.
 *
 * Two-step strategy that avoids loading every company user up-front:
 *   1. `groupBy` direct messages to get the set of counterparts the viewer
 *      has ever chatted with + each pair's max `createdAt`. This set is
 *      bounded by the viewer's actual conversation partners (typically far
 *      smaller than the whole company).
 *   2. Sort that set by timestamp DESC; carve out the chatted slice of the
 *      requested page; for any remaining "never-chatted" rows, fetch them
 *      paginated at the DB level via `findMany` excluding the chatted ids.
 */
export async function fetchUserIdsByLatestMessage(
  currentUserId: number,
  companyId: number,
  skip: number,
  take: number,
): Promise<{ id: number }[]> {
  const pairMaxes = await db.message.groupBy({
    by: ["from", "to"],
    where: {
      groupId: null,
      OR: [{ from: currentUserId }, { to: currentUserId }],
    },
    _max: { createdAt: true },
  });

  const latestByCounterpart = new Map<number, Date>();
  for (const p of pairMaxes) {
    const ts = p._max.createdAt;
    if (!ts) continue;
    const counterpart = p.from === currentUserId ? p.to : p.from;
    if (counterpart == null || counterpart === currentUserId) continue;
    const prev = latestByCounterpart.get(counterpart);
    if (!prev || ts > prev) latestByCounterpart.set(counterpart, ts);
  }

  // Only keep counterparts that are actually still in this company (filters
  // out cross-tenant rows from legacy data).
  const chattedIds = [...latestByCounterpart.keys()];
  const chattedInCompany =
    chattedIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: chattedIds }, companyId },
          select: { id: true },
        })
      : [];
  const chattedInCompanySet = new Set(chattedInCompany.map((u) => u.id));

  const chattedIdsInOrder = chattedIds
    .filter((id) => chattedInCompanySet.has(id))
    .sort((a, b) => {
      const aTs = latestByCounterpart.get(a)!.getTime();
      const bTs = latestByCounterpart.get(b)!.getTime();
      if (aTs !== bTs) return bTs - aTs;
      return a - b;
    });

  // Carve the page from (chatted | never-chatted) ordered concat.
  const chattedTotal = chattedIdsInOrder.length;
  const chattedSliceStart = Math.min(skip, chattedTotal);
  const chattedSliceEnd = Math.min(skip + take, chattedTotal);
  const pageIds = chattedIdsInOrder.slice(chattedSliceStart, chattedSliceEnd);

  const remaining = take - pageIds.length;
  if (remaining > 0) {
    const neverChattedSkip = Math.max(0, skip - chattedTotal);
    const neverChattedUsers = await db.user.findMany({
      where: {
        companyId,
        NOT: { id: { in: [currentUserId, ...chattedIdsInOrder] } },
      },
      orderBy: { id: "asc" },
      skip: neverChattedSkip,
      take: remaining,
      select: { id: true },
    });
    pageIds.push(...neverChattedUsers.map((u) => u.id));
  }

  return pageIds.map((id) => ({ id }));
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
 * each user and the current user, plus the unread count per counterpart.
 * All Prisma fluent calls — `distinct` + `orderBy` does the DISTINCT-ON job
 * in two batched queries (inbound + outbound), merged in JS.
 */
export async function hydrateLatestMessages(
  currentUserId: number,
  users: User[],
): Promise<UserWithLatest[]> {
  if (users.length === 0) return [];
  const otherIds = users.map((u) => u.id);

  // Latest inbound from each counterpart, and latest outbound to each
  // counterpart. Merge by counterpart, keep whichever is newer.
  const messageFields = {
    id: true,
    message: true,
    from: true,
    to: true,
    createdAt: true,
    updatedAt: true,
  } as const;
  const [inbound, outbound] = await Promise.all([
    db.message.findMany({
      where: { groupId: null, from: { in: otherIds }, to: currentUserId },
      distinct: ["from"],
      orderBy: [{ from: "asc" }, { createdAt: "desc" }],
      select: messageFields,
    }),
    db.message.findMany({
      where: { groupId: null, from: currentUserId, to: { in: otherIds } },
      distinct: ["to"],
      orderBy: [{ to: "asc" }, { createdAt: "desc" }],
      select: messageFields,
    }),
  ]);

  const latestByCounterpart = new Map<number, LatestMessageSummary>();
  for (const m of inbound) {
    latestByCounterpart.set(m.from, m);
  }
  for (const m of outbound) {
    if (m.to == null) continue;
    const prev = latestByCounterpart.get(m.to);
    if (!prev || m.createdAt > prev.createdAt) {
      latestByCounterpart.set(m.to, m);
    }
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
