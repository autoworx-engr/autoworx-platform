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
 * ties broken by id ASC. Two Prisma calls, JS sort, then slice for pagination.
 */
export async function fetchUserIdsByLatestMessage(
  currentUserId: number,
  companyId: number,
  skip: number,
  take: number,
): Promise<{ id: number }[]> {
  const [users, pairMaxes] = await Promise.all([
    db.user.findMany({
      where: { companyId, NOT: { id: currentUserId } },
      select: { id: true },
    }),
    db.message.groupBy({
      by: ["from", "to"],
      where: {
        groupId: null,
        OR: [{ from: currentUserId }, { to: currentUserId }],
      },
      _max: { createdAt: true },
    }),
  ]);

  // Collapse (from, to) pair maxes into counterpart → latest timestamp.
  const latestByCounterpart = new Map<number, Date>();
  for (const p of pairMaxes) {
    const ts = p._max.createdAt;
    if (!ts) continue;
    const counterpart = p.from === currentUserId ? p.to : p.from;
    if (counterpart == null || counterpart === currentUserId) continue;
    const prev = latestByCounterpart.get(counterpart);
    if (!prev || ts > prev) latestByCounterpart.set(counterpart, ts);
  }

  const sorted = [...users].sort((a, b) => {
    const aTs = latestByCounterpart.get(a.id)?.getTime() ?? -Infinity;
    const bTs = latestByCounterpart.get(b.id)?.getTime() ?? -Infinity;
    if (aTs !== bTs) return bTs - aTs; // newest first; never-chatted (-Infinity) sinks
    return a.id - b.id;
  });

  return sorted.slice(skip, skip + take);
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
