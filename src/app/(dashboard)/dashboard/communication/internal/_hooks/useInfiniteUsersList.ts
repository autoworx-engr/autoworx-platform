"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUsersWithLatestMessages } from "@/actions/communication/internal/fetchUsersWithLatestMessages";
import { internalKeys } from "../_utils/queryKey";

const DEFAULT_TAKE = 30;

/**
 * Sidebar users list, paginated. Mirrors the shape of
 * `useInfinitySmsQueryByClientId` so List.tsx can reuse the same
 * `fetchNextPage` / `hasNextPage` flow that ClientInfinityScroll uses.
 *
 * Changing `search` re-keys the query, which automatically resets pagination
 * — no manual `setHasMore(false)` toggle required.
 */
export function useInfiniteUsersList({
  companyId,
  search = "",
}: {
  companyId: number;
  search?: string;
}) {
  return useInfiniteQuery({
    queryKey: internalKeys.users(companyId, search),
    queryFn: ({ pageParam }) =>
      fetchUsersWithLatestMessages({
        pageParam,
        take: DEFAULT_TAKE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
  });
}
