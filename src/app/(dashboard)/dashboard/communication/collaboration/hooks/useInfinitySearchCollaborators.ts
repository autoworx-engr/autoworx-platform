"use client";

import { searchCollaborators } from "@/actions/communication/collaboration/searchCollaborators";
import { User } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export type TCollaboratorAdmin = Partial<User> & {
  companyName?: string | null;
  isConnected: boolean;
  companyStatus?: string | null;
};

async function fetchSearchCollaborators({
  pageParam,
  search,
}: {
  pageParam: number;
  search: string;
}) {
  const res = await searchCollaborators({
    page: pageParam,
    limit: PAGE_SIZE,
    search,
  });

  return {
    data: res.data as TCollaboratorAdmin[],
    total: res.total,
    nextPage: res.hasMore ? pageParam + 1 : undefined,
    hasMore: res.hasMore,
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
