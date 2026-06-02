"use client";

import { fetchGroupsList } from "@/actions/communication/internal/fetchGroupsList";
import { useInfiniteQuery } from "@tanstack/react-query";
import { internalKeys } from "../_utils/queryKey";

const DEFAULT_TAKE = 15;

/**
 * Sidebar groups list, paginated. Mirrors `useInfiniteUsersList` so the
 * Groups tab in List.tsx can reuse the same `fetchNextPage` / `hasNextPage`
 * scroll flow.
 */
export function useInfiniteGroupsList({
  companyId,
  search = "",
}: {
  companyId: number;
  search?: string;
}) {
  return useInfiniteQuery({
    queryKey: internalKeys.groups(companyId, search),
    queryFn: ({ pageParam }) =>
      fetchGroupsList({
        pageParam,
        take: DEFAULT_TAKE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
  });
}
