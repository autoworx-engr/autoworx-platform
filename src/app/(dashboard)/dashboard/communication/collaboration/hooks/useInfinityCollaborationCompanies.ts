"use client";

import axiosInstance from "@/helpers/axios";
import { Company, User } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export type TCollaborationCompany = Company & { users: User[] };

type FetchArgs = { pageParam: number; search: string };

async function fetchCollaborationCompanies({ pageParam, search }: FetchArgs) {
  const res = await axiosInstance.get(
    `/api/communication/collaboration/company/userlist`,
    { params: { page: pageParam, limit: PAGE_SIZE, search } },
  );

  const json = res.data;
  if (!json.success) throw new Error(json.error || "Failed to load companies");

  return {
    data: (json.data ?? []) as TCollaborationCompany[],
    total: json.meta?.totalRecords ?? 0,
    nextPage: json.meta?.hasNextPage ? pageParam + 1 : undefined,
    hasMore: !!json.meta?.hasNextPage,
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
