"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getUserMessagesByPair } from "@/actions/communication/internal/query";
import { internalKeys } from "../_utils/queryKey";

const DEFAULT_TAKE = 20;

/**
 * Reverse-paginated direct-message thread between two users. Pages return
 * newest-first; `SmsBox.tsx` reverses for display so the rendered order is
 * oldest-at-top, newest-at-bottom.
 */
export function useInfiniteUserMessages({
  currentUserId,
  otherUserId,
  enabled = true,
}: {
  currentUserId: number;
  otherUserId: number;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: internalKeys.userMessages(currentUserId, otherUserId),
    queryFn: ({ pageParam }) =>
      getUserMessagesByPair(currentUserId, otherUserId, {
        pageParam,
        take: DEFAULT_TAKE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled:
      enabled && Number.isFinite(currentUserId) && Number.isFinite(otherUserId),
  });
}
