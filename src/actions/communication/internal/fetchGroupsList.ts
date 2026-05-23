"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const DEFAULT_TAKE = 30;

type Params = {
  /** 1-based page number, mirrors `fetchUsersWithLatestMessages`. */
  pageParam?: number;
  take?: number;
  search?: string;
};

export type FetchGroupsPage = {
  data: Awaited<ReturnType<typeof fetchGroupsList>>["data"];
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
 * top. Search filters by name (case-insensitive contains).
 */
export async function fetchGroupsList({
  pageParam = 1,
  take = DEFAULT_TAKE,
  search,
}: Params = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return {
      data: [] as Array<Prisma.GroupGetPayload<{ include: { users: true } }>>,
      total: 0,
      nextPage: undefined as number | undefined,
      hasMore: false,
    };
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

  const [data, total] = await Promise.all([
    db.group.findMany({
      where,
      include: { users: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    db.group.count({ where }),
  ]);

  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
}
