import getClients from "@/actions/client/get";
import { Client, Source, Tag } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

type TClientQueryParam = {
  search?: string;
  currentPage?: number;
  pageSize?: number;
  enabled?: boolean;
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
  enabled = true,
}: TClientQueryParam) {
  return useQuery({
    queryKey: [CLIENT_LIST_KEY, search, currentPage, pageSize],
    queryFn: async () => {
      const { clients, totalClients } = await getClients({
        search: search?.trim() || "",
        currentPage,
        pageSize,
      });
      return { clients, totalClients } as TClientQueryResult;
    },
    enabled,
  });
}
