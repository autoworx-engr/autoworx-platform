import { useInfiniteQuery } from "@tanstack/react-query";
import { getMessengerMessages } from "../_actions/getMessengerMessages";
import { messengerQueryKey } from "../_utils/queryKey";

const DEFAULT_TAKE = 20;

const fetchPage = async ({
  pageParam,
  clientId,
}: {
  pageParam: number;
  clientId: number;
}) => {
  const { data, total } = await getMessengerMessages(clientId, {
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

export default function useInfinityMessengerQuery(clientId: number) {
  return useInfiniteQuery({
    queryKey: messengerQueryKey.allByClientId(clientId),
    queryFn: ({ pageParam }) =>
      fetchPage({ pageParam: pageParam as number, clientId }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}
