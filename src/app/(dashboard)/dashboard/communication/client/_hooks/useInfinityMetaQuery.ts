import { useInfiniteQuery } from "@tanstack/react-query";
import getMetaMessages from "../_actions/getMetaMessages";
import { metaQueryKey } from "../_utils/queryKey";

const defaultTake = 20;

const fetchClientMeta = async ({
  pageParam = 1,
  clientId,
}: {
  pageParam: number;
  clientId: number;
}) => {
  const { data, total } = await getMetaMessages(clientId, {
    take: defaultTake,
    skip: (pageParam - 1) * defaultTake,
    orderBy: { createdAt: "desc" },
  });
  const hasMore = defaultTake * pageParam < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
};

/**
 * TanStack Query infinite-scroll hook for a client's Meta messages.
 *
 * Pages are fetched in reverse-chronological order (newest first), 20 at a
 * time. `MetaBox` calls `fetchNextPage` when the user scrolls to the top to
 * load older messages. Mirrors `useInfinitySmsQuery` exactly.
 *
 * @param clientId - Client whose messages to load
 */
export default function useInfinityMetaQueryByClientId(clientId: number) {
  return useInfiniteQuery({
    queryKey: metaQueryKey.allByClientId(clientId),
    queryFn: ({ pageParam }) =>
      fetchClientMeta({ pageParam: pageParam as number, clientId }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}
