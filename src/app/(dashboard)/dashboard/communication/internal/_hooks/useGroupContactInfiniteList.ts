"use client";

import { searchUsers } from "@/actions/communication/internal/searchUser";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { User } from "@prisma/client";

export type TContactListUser = { id: number; name: string };

const DEFAULT_TAKE = 20;

export function useGroupContactInfiniteList(
  initialUsers: User[],
  excludeIds: number[] = [],
) {
  const [contactList, setContactList] = useState<TContactListUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const excludedIds = [...contactList.map((u) => u.id), ...excludeIds];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["group-contact-list", searchTerm, excludedIds],
      queryFn: ({ pageParam }) =>
        searchUsers(searchTerm, excludedIds, {
          pageParam,
          take: DEFAULT_TAKE,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.nextPage : undefined,
      initialData: {
        pages: [
          {
            success: true,
            data: initialUsers,
            hasMore: false,
            nextPage: undefined,
          },
        ],
        pageParams: [1],
      },
    });

  const groupUsers =
    data?.pages.flatMap((page) => (page.success ? page.data : [])) ?? [];

  const handleSearch = useDebounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, 300);

  const addToContactList = useCallback(
    (user: User): { ok: true } | { ok: false; reason: "duplicate" } => {
      if (contactList.some((u) => u.id === user.id)) {
        return { ok: false, reason: "duplicate" };
      }
      const name = `${user.firstName} ${user.lastName}`;
      setContactList((prev) => [...prev, { id: user.id, name }]);
      return { ok: true };
    },
    [contactList],
  );

  const removeFromContactList = useCallback((user: TContactListUser) => {
    setContactList((prev) => prev.filter((u) => u.id !== user.id));
  }, []);

  const reset = useCallback(() => {
    setContactList([]);
    setSearchTerm("");
  }, []);

  return {
    groupUsers,
    contactList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    handleSearch,
    addToContactList,
    removeFromContactList,
    reset,
    setContactList,
  };
}
