"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { buildUserSearchWhere } from "./_utils/userSearch";

const DEFAULT_TAKE = 30;

type SearchOptions = {
  /** 1-based page number. */
  pageParam?: number;
  take?: number;
};

export const searchUsers = async (
  searchTerm: string,
  excludeIds?: number[] | null,
  { pageParam = 1, take = DEFAULT_TAKE }: SearchOptions = {},
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return {
      success: false,
      data: [] as never[],
      hasMore: false,
      nextPage: undefined as number | undefined,
    };
  }

  const currentUserId = parseInt(session.user.id, 10);
  const excludedIdSet = new Set<number>([currentUserId]);
  if (excludeIds && excludeIds.length) {
    for (const id of excludeIds) excludedIdSet.add(id);
  }

  const skip = Math.max(0, (pageParam - 1) * take);
  const where = {
    companyId: session.user.companyId,
    id: { notIn: [...excludedIdSet] },
    ...buildUserSearchWhere(searchTerm),
  };

  // Take + 1 so we can detect a next page without a separate count query.
  const rows = await db.user.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { id: "asc" }],
    skip,
    take: take + 1,
  });
  const hasMore = rows.length > take;
  const data = hasMore ? rows.slice(0, take) : rows;

  return {
    success: true,
    data,
    hasMore,
    nextPage: hasMore ? pageParam + 1 : undefined,
  };
};
