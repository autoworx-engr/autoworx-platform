import { useInfiniteQuery } from "@tanstack/react-query";
import getSms from "../_actions/getSms";
import { smsQueryKey } from "../_utils/queryKey";

const defaultTake = 20;
const fetchClientSms = async ({
  pageParam = 1,
  clientId,
}: {
  pageParam: number;
  clientId: number;
}) => {
  const { data: clientSms, totalSmsCount } = await getSms(clientId, {
    take: defaultTake,
    skip: (pageParam - 1) * defaultTake,
    // `id` breaks the tie: segments of one split reply can land in the same
    // millisecond, and createdAt alone leaves their order up to the DB.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const hasMore = defaultTake * pageParam < totalSmsCount;
  return {
    data: clientSms,
    total: totalSmsCount,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore: hasMore,
  };
};

export default function useInfinitySmsQueryByClientId(clientId: number) {
  return useInfiniteQuery({
    queryKey: smsQueryKey.allSmsByClientId(clientId),
    queryFn: ({ pageParam }) =>
      fetchClientSms({ pageParam: pageParam, clientId }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}
