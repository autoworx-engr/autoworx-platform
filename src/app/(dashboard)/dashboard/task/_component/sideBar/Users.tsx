"use client";

import NewEmployee from "@/components/Lists/NewEmployee";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FaUser } from "react-icons/fa";
import { userQueryKey } from "../../_constant";
import useInfinityUsersQuery from "../../_hook/useInfinityUsersQuery";
import TaskSpinner from "../ui/TaskSpinner";
import { MinimizeButton } from "./MinimizeButton";
import UserComponent from "./UserComponent";
import { useDebounce } from "@/hooks/useDebounce";

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

  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const minimized = useCalendarSidebarStore((x) => x.minimized);
  const setMinimized = useCalendarSidebarStore((x) => x.setMinimized);

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
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <TaskSpinner />
        <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
          Loading users...
        </h3>
      </div>
    );
  } else if (!isLoading && isError) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FaUser className="mb-4 h-12 w-12 text-gray-400" />
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
        <FaUser className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
          No users found
        </h3>
        <p className="text-sm text-gray-500">
          Try searching again or add a new user.
        </p>
      </div>
    );
  } else if (!isLoading && !isError && users && users.length > 0) {
    content = users.map((user, index) => {
      const isSelected = selectedUser === index;

      function handleClick() {
        if (isSelected) {
          setSelectedUser(null);
        } else {
          setSelectedUser(index);
        }
        setMinimized(false);
      }

      return (
        <UserComponent
          key={index}
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
      }
    );
  };

  return (
    <div
      className={cn(
        "md:app-shadow relative mt-5 flex flex-grow flex-col gap-2 overflow-hidden rounded-[12px] md:bg-background",
        minimized || "p-3"
      )}
    >
      <div>
        <h2 className="flex items-center justify-between">
          {!minimized && (
            <div className="mb-4 text-base font-semibold text-gray-900 md:text-[16px] md:text-[#797979]">
              User List
            </div>
          )}
          <div className="hidden md:block">
            <MinimizeButton />
          </div>
        </h2>

        {!minimized && (
          <form
            className="thin-scrollbar mt-3 flex items-center justify-center gap-2 overflow-y-auto"
            action={(formData: FormData) => {
              const searchValue = formData.get("search") as string;
              searchUser(searchValue);
            }}
          >
            <input
              type="search"
              className="w-[70%] rounded-[5px] border-none bg-[#F5F5F5] p-2 text-[13px] outline-none"
              placeholder="Search here..."
              name="search"
              onChange={(e) => searchUser(e.target.value)}
            />
            <button className="w-[30%] rounded-[5px] bg-[#797979] p-2 text-[13px] text-white">
              Search
            </button>
          </form>
        )}
      </div>

      {!minimized && (
        <div className="thin-scrollbar h-full space-y-2 overflow-y-auto">
          {content}
          <div ref={ref} className="text-center text-sm text-gray-500">
            {isFetchingNextPage ? (
              <TaskSpinner />
            ) : hasNextPage ? (
              "Scroll to load more"
            ) : (
              users.length !== 0 && "No more Users"
            )}
          </div>
        </div>
      )}

      {!minimized && (
        <NewEmployee
          button={
            <button className="mt-4 w-full rounded-[5px] bg-blue-600 py-2 text-[15px] text-white">
              + Add User
            </button>
          }
          onSuccess={(newUser) => {
            if (newUser) {
              handleCreateUsers(newUser);
              setSelectedUser(null); // Reset selection after adding a new user
            }
          }}
        />
      )}
    </div>
  );
}
