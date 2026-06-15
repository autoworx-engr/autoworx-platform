"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export type TCollaborationMessage = {
  id: number;
  message: string | null;
  createdAt: string;
  attachments: unknown[];
  requestEstimate: unknown;
  senderUser: {
    id: number;
    firstName: string;
    lastName: string;
    image: string | null;
  } | null;
  fromCompanyId: number;
  toCompanyId: number;
  isOwnMessage: boolean;
};

type FetchArgs = {
  pageParam: number;
  viewerCompanyId: number;
  otherCompanyId: number;
};

async function fetchCollaborationMessages({
  pageParam,
  viewerCompanyId,
  otherCompanyId,
}: FetchArgs) {
  const skip = (pageParam - 1) * PAGE_SIZE;
  const res = await fetch(
    `/api/communication/collaboration/messages/v2-messages?companyA=${viewerCompanyId}&companyB=${otherCompanyId}&viewerCompanyId=${viewerCompanyId}&skip=${skip}&take=${PAGE_SIZE}`,
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Failed to load messages");

  return {
    data: data.messages as TCollaborationMessage[],
    total: data.meta?.total ?? 0,
    nextPage: data.meta?.hasMore ? pageParam + 1 : undefined,
    hasMore: !!data.meta?.hasMore,
  };
}

export function useInfinityCollaborationMessages(
  viewerCompanyId: number | undefined,
  otherCompanyId: number | undefined,
) {
  return useInfiniteQuery({
    queryKey: ["collaboration-messages", viewerCompanyId, otherCompanyId],
    queryFn: ({ pageParam }) =>
      fetchCollaborationMessages({
        pageParam,
        viewerCompanyId: viewerCompanyId!,
        otherCompanyId: otherCompanyId!,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
    enabled: !!viewerCompanyId && !!otherCompanyId,
  });
}
