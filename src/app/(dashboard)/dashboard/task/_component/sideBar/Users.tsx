"use client";

import NewEmployee from "@/components/Lists/NewEmployee";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { userQueryKey } from "../../_constant";
import useInfinityUsersQuery from "../../_hook/useInfinityUsersQuery";
import TaskSpinner from "../ui/TaskSpinner";
import { MinimizeButton } from "./MinimizeButton";
import UserComponent from "./UserComponent";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, User as UserIcon } from "lucide-react";
import UserListSkeleton from "@/components/ui/UserListSkeleton";

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
      // <div className="flex flex-col items-center justify-center py-10 text-center">
      //   <TaskSpinner />
      //   <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
      //     Loading users...
      //   </h3>
      // </div>

      <UserListSkeleton rows={8} />
    );
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
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors duration-300"
              />
              <input
                type="search"
                className="
            w-full rounded-xl border-none p-2 pl-9 text-sm 
            bg-slate-100 dark:bg-slate-700 
            text-slate-700 dark:text-slate-50 
            outline-none transition-all duration-300 ease-in-out 
            focus:ring-2 focus:ring-[#6571FF] focus:bg-white dark:focus:bg-slate-800
            placeholder:text-slate-500 dark:placeholder:text-slate-500
          "
                placeholder="Search users..."
                name="search"
                // Continuous search as the user types (if desired by the original logic)
                onChange={(e) => searchUser(e.target.value)}
              />
            </div>

<<<<<<< HEAD
            {/* Submit Button - Styled as a secondary action with professional flair */}
            {/* <button
              type="submit"
              className="
=======
      {/* Submit Button - Styled as a secondary action with professional flair */}
      <button 
        type="submit"
        className="
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d
          w-auto px-4 py-2 text-sm font-bold rounded-xl 
          text-white 
         bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out
        "
<<<<<<< HEAD
            >
              Search
            </button> */}
          </form>
=======
      >
        Search
      </button>
    </form>
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d
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
            <button className="mt-4 w-full rounded-xl bg-blue-600 py-2 text-[15px] text-white flex items-center justify-center gap-2 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out

  // Gradient Background (Blue/Indigo)
  bg-gradient-to-r from-[#6571FF] to-[#5a66ee]

  // Subtle Lift and Shadow Glow on Hover
  shadow-md shadow-[#6571FF]/40
  hover:-translate-y-0.5
  hover:scale-[1.01]
  hover:shadow-lg hover:shadow-[#6571FF]/60
  dark:shadow-[#6571FF]/40 dark:hover:shadow-[#6571FF]/60">
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
