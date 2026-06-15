"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma, User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { buildUserSearchWhere } from "./_utils/userSearch";
import {
  countCompanyUsers,
  fetchUserIdsByLatestMessage,
  hydrateLatestMessages,
  type UserWithLatest,
} from "./_utils/usersWithLatestMessagesQuery";

const DEFAULT_TAKE = 30;

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
 *   message with the current user (NULLS LAST). Pagination is pushed into
 *   Postgres so the client only receives `take` rows.
 * - With a `search` term: name/email/phone search via the shared
 *   `buildUserSearchWhere` predicate; results ordered by firstName.
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

  // No search: order by latest direct-message activity at the DB layer.
  const orderedRows = await fetchUserIdsByLatestMessage(
    currentUserId,
    companyId,
    skip,
    take,
  );
  const total = await countCompanyUsers(currentUserId, companyId);

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
