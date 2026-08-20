"use client";

import NewEmployee from "@/components/Lists/NewEmployee";
import UserListSkeleton from "@/components/ui/UserListSkeleton";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { Search, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { userQueryKey } from "../../_constant";
import useInfinityUsersQuery from "../../_hook/useInfinityUsersQuery";
import TaskSpinner from "../ui/TaskSpinner";
import { MinimizeButton } from "./MinimizeButton";
import UserComponent from "./UserComponent";

export default function Users() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    amount: 0.5,
    margin: "0px 100px -50px 0px",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityUsersQuery(searchTerm);

  const users = data?.pages?.flatMap((page) => page.data) || [];
  const totalUsers = data?.pages?.[0]?.total ?? 0;

  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const searchUser = useDebounce(function searchUser(value: string) {
    setSearchTerm(value);
  }, 500);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage]);

  let content = null;
  if (isLoading && !isError) {
    content = <UserListSkeleton rows={8} />;
  } else if (!isLoading && isError) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <UserIcon className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-red-600 md:text-[#797979]">
          Error loading users
        </h3>
        <p className="text-sm text-gray-500">
          Please try again later or contact support.
        </p>
      </div>
    );
  } else if (!isLoading && !isError && users && users.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <UserIcon className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
          No users found
        </h3>
        <p className="text-sm text-gray-500">
          Try searching again or add a new user.
        </p>
      </div>
    );
  } else if (!isLoading && !isError && users && users.length > 0) {
    content = users.map((user) => {
      const isSelected = selectedUser === user.id;

      function handleClick() {
        setSelectedUser(isSelected ? null : user.id);
      }

      return (
        <UserComponent
          key={user.id}
          isSelected={isSelected}
          onSelect={handleClick}
          user={user}
        />
      );
    });
  }

  const handleCreateUsers = (newUser: User | null) => {
    queryClient.setQueryData(
      [userQueryKey.users, searchTerm],
      (oldData?: { pageParams: number[]; pages: any }) => {
        if (!oldData)
          return [
            {
              pageParams: [1],
              pages: [
                {
                  data: [newUser],
                  total: 1,
                  nextPage: undefined,
                  hasMore: false,
                },
              ],
            },
          ];
        const updatedPages = oldData.pages.map((page: any, index: number) => {
          // insert the new task at the beginning of the first page
          if (index === 0) {
            return {
              ...page,
              data: [newUser, ...page.data],
            };
          }
          return page;
        });
        return {
          pageParams: oldData.pageParams,
          pages: updatedPages,
        };
      },
    );
  };

  return (
    <div className="md:app-shadow relative flex h-full min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden rounded-lg p-3 md:max-w-80 md:bg-background">
      <div>
        <h2 className="flex items-center justify-between ">
          <div className="text-base font-semibold text-gray-900 md:text-[16px] md:text-[#797979]">
            User List
          </div>
          <div className="hidden md:block">
            <MinimizeButton />
          </div>
        </h2>

        <form
          className="mt-4 flex items-center justify-center gap-2"
          // Using onSubmit for better client-side handling, preventing full page reload
          onSubmit={(e) => {
            e.preventDefault();
            // Extracting value from the form input explicitly
            const form = e.currentTarget;
            const input = form.elements.namedItem("search") as HTMLInputElement;
            searchUser(input.value);
          }}
        >
          {/* Search Input Container for Icon and Input */}
          <div className="relative flex-grow">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-300 dark:text-slate-500" />
            <input
              type="search"
              className="w-full rounded-xl border-none bg-slate-100 p-2 pl-9 text-sm text-slate-700 outline-none transition-all duration-300 ease-in-out placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              placeholder="Search Users..."
              name="search"
              // Continuous search as the user types (if desired by the original logic)
              onChange={(e) => searchUser(e.target.value)}
            />
          </div>
        </form>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {content}
        <div ref={ref} className="text-center text-sm text-gray-500">
          {isFetchingNextPage ? (
            <TaskSpinner />
          ) : hasNextPage ? (
            "Scroll to load more"
          ) : (
            users.length !== 0 && totalUsers >= 20 && "No more Users"
          )}
        </div>
      </div>

      <NewEmployee
        button={<Button className="w-full rounded-lg">+ Add User</Button>}
        onSuccess={(newUser) => {
          if (newUser) {
            handleCreateUsers(newUser);
            setSelectedUser(null); // Reset selection after adding a new user
          }
        }}
      />
    </div>
  );
}
