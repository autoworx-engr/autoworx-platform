"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getGroupMessagesPaginated } from "@/actions/communication/internal/query";
import { internalKeys } from "../_utils/queryKey";

const DEFAULT_TAKE = 20;

/**
 * Reverse-paginated group chat. Newest page first; render reversed so the
 * UI shows oldest-at-top.
 */
export function useInfiniteGroupMessages({
  groupId,
  enabled = true,
}: {
  groupId: number;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: internalKeys.groupMessages(groupId),
    queryFn: ({ pageParam }) =>
      getGroupMessagesPaginated(groupId, {
        pageParam,
        take: DEFAULT_TAKE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: enabled && Number.isFinite(groupId),
  });
}
