"use client";

import { listCollaborationCompanies } from "@/actions/communication/collaboration/listCollaborationCompanies";
import { Company, User } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export type TCollaborationCompany = Company & { users: User[] };

async function fetchCollaborationCompanies({
  pageParam,
  search,
}: {
  pageParam: number;
  search: string;
}) {
  const res = await listCollaborationCompanies({
    page: pageParam,
    limit: PAGE_SIZE,
    search,
  });

  return {
    data: res.data as TCollaborationCompany[],
    total: res.total,
    nextPage: res.hasMore ? pageParam + 1 : undefined,
    hasMore: res.hasMore,
  };
}

export function useInfinityCollaborationCompanies(search: string = "") {
  return useInfiniteQuery({
    queryKey: ["collaboration-companies", search],
    queryFn: ({ pageParam }) =>
      fetchCollaborationCompanies({ pageParam, search }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}
