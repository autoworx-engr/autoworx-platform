import getClientList from "@/actions/client/getClientList";
import { Client, Source, Tag } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

type TClientQueryParam = {
  search?: string;
  currentPage?: number;
  pageSize?: number;
};

type TClientQueryResult = {
  clients: (Client & { tag: Tag | null; source: Source | null })[];
  totalClients: number;
};


export const CLIENT_LIST_KEY = "clients";

export default function useClientQuery({
  search,
  currentPage = 1,
  pageSize = 50,
}: TClientQueryParam) {
  return useQuery({
    queryKey: [CLIENT_LIST_KEY, search, currentPage, pageSize],
    queryFn: async () => {
      const { clients, totalClients } = await getClientList(
        {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            tag: {
              where: { type: "CLIENT" },
            },
            source: true,
          },

          orderBy: {
            createdAt: "desc",
          },
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        },
        search
      );
      console.log({ clients, totalClients });
      return { clients, totalClients } as TClientQueryResult;
    },
  });
}
