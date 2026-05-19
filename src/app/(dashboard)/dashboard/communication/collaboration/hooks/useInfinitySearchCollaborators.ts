"use client";

import axiosInstance from "@/helpers/axios";
import { User } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export type TCollaboratorAdmin = Partial<User> & {
  companyName?: string | null;
  isConnected: boolean;
  companyStatus?: string | null;
};

type FetchArgs = { pageParam: number; search: string };

async function fetchSearchCollaborators({ pageParam, search }: FetchArgs) {
  const res = await axiosInstance.get(
    `/api/communication/collaboration/company/companylist`,
    { params: { page: pageParam, limit: PAGE_SIZE, search } },
  );

  const json = res.data;
  if (!json.success) throw new Error(json.error || "Failed to load companies");

  return {
    data: (json.data ?? []) as TCollaboratorAdmin[],
    total: json.meta?.totalRecords ?? 0,
    nextPage: json.meta?.hasNextPage ? pageParam + 1 : undefined,
    hasMore: !!json.meta?.hasNextPage,
  };
}

export function useInfinitySearchCollaborators(
  search: string = "",
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: ["search-collaborators", search],
    queryFn: ({ pageParam }) => fetchSearchCollaborators({ pageParam, search }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
    enabled,
  });
}
