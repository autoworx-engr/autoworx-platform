import getClientList from "@/actions/client/getClientList";
import { queryKeys } from "@/lib/queryKeys";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export default function useClientListInfiniteQuery(search?: string) {
  return useInfiniteQuery({
    queryKey: [queryKeys.clientList, "infinite", search],
    queryFn: async ({ pageParam = 0 }) => {
      const clients = await getClientList({
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
        skip: pageParam * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          createdAt: "desc",
        },
      });

      let filteredClients = clients;
      if (search) {
        const searchNormalized = search?.toLowerCase().replace(/\s+/g, "");

        filteredClients = clients?.filter((c) => {
          const fullNameNormalized = `${c.firstName}${c.lastName}`
            .toLowerCase()
            .replace(/\s+/g, "");
          return fullNameNormalized.includes(searchNormalized);
        });
      }

      return {
        clients: filteredClients,
        nextPage:
          filteredClients?.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}
