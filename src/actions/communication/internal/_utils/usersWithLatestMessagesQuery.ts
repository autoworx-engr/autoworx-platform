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
 * Both halves are paginated at the DB level — the frontend's infinite
 * scroll just sends `pageParam`; the per-page work here scales with the
 * page size, not with the company / conversation count:
 *
 *   1. Chatted portion → `db.chatTrack.findMany` ordered by `updatedAt desc`
 *      with `skip`/`take`. One chatTrack row = one counterpart.
 *   2. Never-chatted portion (only when the page actually crosses into it)
 *      → `db.user.findMany` with `skip`/`take` and `NOT IN chattedIds`. The
 *      full chatted-id set is loaded once *only* for the NOT exclusion, and
 *      only on pages that need never-chatted rows.
 */
export async function fetchUserIdsByLatestMessage(
  currentUserId: number,
  companyId: number,
  skip: number,
  take: number,
): Promise<{ id: number }[]> {
  const trackWhere = {
    section: "internal" as const,
    OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
  };

  const chattedTotal = await db.chatTrack.count({ where: trackWhere });
  const pageIds: number[] = [];

  // ---- Chatted portion (DB-paginated chatTrack) ----
  if (skip < chattedTotal && take > 0) {
    const chattedTake = Math.min(take, chattedTotal - skip);
    const tracks = await db.chatTrack.findMany({
      where: trackWhere,
      orderBy: { updatedAt: "desc" },
      skip,
      take: chattedTake,
      select: { senderId: true, receiverId: true },
    });

    const orderedCounterpartIds = tracks
      .map((t) => (t.senderId === currentUserId ? t.receiverId : t.senderId))
      .filter((id): id is number => id != null && id !== currentUserId);

    // Validate counterparts still belong to the caller's company (filters
    // legacy cross-tenant chatTracks). The findMany only returns matching
    // ids; we re-attach to preserve original chatTrack order.
    if (orderedCounterpartIds.length > 0) {
      const valid = await db.user.findMany({
        where: { id: { in: orderedCounterpartIds }, companyId },
        select: { id: true },
      });
      const validSet = new Set(valid.map((u) => u.id));
      for (const id of orderedCounterpartIds) {
        if (validSet.has(id)) pageIds.push(id);
      }
    }
  }

  // ---- Never-chatted portion (DB-paginated user.findMany) ----
  const remaining = take - pageIds.length;
  if (remaining > 0) {
    // Full chatted-id set is only needed here, for the NOT IN exclusion.
    // Pages that stay entirely in chatted territory never run this query.
    const allTracks = await db.chatTrack.findMany({
      where: trackWhere,
      select: { senderId: true, receiverId: true },
    });
    const chattedIdSet = new Set<number>();
    for (const t of allTracks) {
      const other = t.senderId === currentUserId ? t.receiverId : t.senderId;
      if (other != null && other !== currentUserId) chattedIdSet.add(other);
    }

    const neverChattedSkip = Math.max(0, skip - chattedTotal);
    const neverChattedUsers = await db.user.findMany({
      where: {
        companyId,
        NOT:
          chattedIdSet.size > 0
            ? [{ id: currentUserId }, { id: { in: [...chattedIdSet] } }]
            : { id: currentUserId },
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
