import { useInfiniteQuery } from "@tanstack/react-query";
import { getInstagramMessages } from "../_actions/getInstagramMessages";
import { instagramQueryKey } from "../_utils/queryKey";

const DEFAULT_TAKE = 20;

const fetchPage = async ({
  pageParam,
  clientId,
}: {
  pageParam: number;
  clientId: number;
}) => {
  const { data, total } = await getInstagramMessages(clientId, {
    take: DEFAULT_TAKE,
    skip: (pageParam - 1) * DEFAULT_TAKE,
  });
  const hasMore = DEFAULT_TAKE * pageParam < total;
  return {
    data,
    total,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore,
  };
};

export default function useInfinityInstagramQuery(clientId: number) {
  return useInfiniteQuery({
    queryKey: instagramQueryKey.allByClientId(clientId),
    queryFn: ({ pageParam }) =>
      fetchPage({ pageParam: pageParam as number, clientId }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}
