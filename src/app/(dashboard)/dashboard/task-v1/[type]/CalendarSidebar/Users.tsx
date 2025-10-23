"use client";

import { useState } from "react";
import UserComponent from "./User";
import UserListSkeleton from "@/components/ui/UserListSkeleton";
import { Task, User } from "@prisma/client";
import { MinimizeButton } from "./MinimiseButton";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { cn } from "@/lib/cn";
import NewEmployee from "@/components/Lists/NewEmployee";
import { User as UserIcon } from "lucide-react";

export default function Users({
  users,
  tasks,
}: {
  users: (User & { tasks: Task[] })[];
  tasks: Task[];
}) {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const minimized = useCalendarSidebarStore((x) => x.minimized);
  const setMinimized = useCalendarSidebarStore((x) => x.setMinimized);
  const [usersToDisplay, setUsersToDisplay] = useState(users);

  function searchUser(formData: FormData) {
    const searchValue = formData.get("search") as string;
    const filteredUsers = users.filter((user) =>
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchValue.toLowerCase())
    );
    setUsersToDisplay(filteredUsers);
  }

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
            action={searchUser}
          >
            <input
              type="search"
              className="w-[70%] rounded-[5px] border-none bg-[#F5F5F5] p-2 text-[13px] outline-none"
              placeholder="Search here..."
              name="search"
            />
            <button className="w-[30%] rounded-[5px] bg-[#797979] p-2 text-[13px] text-white">
              Search
            </button>
          </form>
        )}
      </div>

      <div className="thin-scrollbar my-2 flex-grow overflow-y-auto">
        {!minimized &&
          // Show a skeleton while users prop is loading (undefined/null)
          (!users ? (
            <UserListSkeleton rows={6} />
          ) : usersToDisplay.length > 0 ? (
            usersToDisplay.map((user, index) => {
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
                  handleClick={handleClick}
                  user={user}
                  users={users}
                  index={index}
                  tasks={tasks}
                  setUsers={setUsersToDisplay}
                />
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UserIcon className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
                No users found
              </h3>
              <p className="text-sm text-gray-500">
                Try searching again or add a new user.
              </p>
            </div>
          ))}
      </div>

      {!minimized && (
        <NewEmployee
          button={
            <button className="mt-4 w-full rounded-[5px] bg-blue-600 py-2 text-[15px] text-white">
              + Add User
            </button>
          }
          onSuccess={(newUser) => {
            if (newUser) {
              setUsersToDisplay([
                ...usersToDisplay,
                {
                  ...newUser,
                  tasks: [],
                },
              ]);
            }
          }}
        />
      )}
    </div>
  );
}
