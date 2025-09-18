"use client";

import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";

import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import React from "react";
import Avatar from "@/components/Avatar";
import UserTaskList from "./UserTaskList";

type TUserComponentProps = {
  //   handleClick: () => void;
  isSelected: boolean;
  onSelect: () => void;
  user: User;
  //   users: User[];
  //   index: number;
  //   tasks: Task[];
  //   setUsers: React.Dispatch<React.SetStateAction<(User & { tasks: Task[] })[]>>;
};

export default function UserComponent({
  isSelected,
  //   handleClick,
  onSelect,
  user,
  //   users,
  //   index,
  //   tasks,
  //   setUsers,
}: TUserComponentProps) {
  const { open } = usePopupStore();
  const minimized = useCalendarSidebarStore((x) => x.minimized);

  return (
    <>
      <button
        className={cn(
          "mt-2 flex w-full items-center rounded-lg sm:h-[12%] pl-2",
          isSelected ? "bg-[#006D77]" : "bg-[#F8F9FA]"
        )}
        onClick={onSelect}
      >
        <Avatar photo={user.image} width={40} height={40} />
        <p
          className={cn(
            "ml-2 text-[14px] font-bold sm:text-xs",
            isSelected ? "text-white" : "text-[#797979]",
            minimized && "sr-only"
          )}
        >
          {user.firstName} {user.lastName}
        </p>
      </button>

      {isSelected && !minimized && <UserTaskList user={user} />}
    </>
  );
}
