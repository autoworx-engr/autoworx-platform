import getClientList from "@/actions/client/getClientList";
import { queryKeys } from "@/lib/queryKeys";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export default function useClientListInfiniteQuery(search?: string) {
  return useInfiniteQuery({
    queryKey: [queryKeys.clientList, "infinite", search ?? ""],

    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;

      const { clients } = await getClientList(
        {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            isFleet: true,
            Lead: {
              select: {
                id: true,
                companyId: true,
                columnId: true,
              },
            },
            mobile: true,
          },
          skip: page * PAGE_SIZE,
          take: PAGE_SIZE,
          orderBy: { createdAt: "desc" },
        },
        search,
      );

      return {
        clients,
        page,
        hasMore: clients.length === PAGE_SIZE,
      };
    },

    initialPageParam: 0,

    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,

    enabled: true,
  });
}
