"use client";

import { cn } from "@/lib/cn";
import { TASK_COLOR } from "@/lib/consts";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";

import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import React from "react";
import Avatar from "@/components/Avatar";
import UserTaskList from "./UserTaskList";
import { ChevronRight } from "lucide-react";

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

  const baseClasses = cn(
    "relative w-full flex items-center h-16 sm:h-[12%] py-2 px-3",
    "transition-all duration-300 ease-in-out",
    "rounded-xl", // Rounded corners for modern look
    "cursor-pointer",
    // Base ring for clean separation
    "ring-1 dark:ring-slate-700/50" 
  );
  
  // Define the hover/selection state classes
  const interactiveClasses = isSelected
    ? // SELECTED STATE: Gradient background accent and white text
      `transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50
  hover:shadow-xl hover:shadow-blue-500/70
  dark:shadow-indigo-600/50 dark:hover:shadow-indigo-600/70 text-white`
    : // DEFAULT STATE: Subtle hover effects
      "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:shadow-md hover:shadow-slate-900/5 transition-all duration-300";
  return (
    <>
      <button
        className={cn(baseClasses, interactiveClasses)}
        onClick={onSelect}
      >
        {/* Avatar - kept clean and functional */}
        <Avatar photo={user.image} width={40} height={40} />
        
        {/* User Name */}
        <p
          className={cn(
            "ml-3 flex-grow text-left text-base font-semibold truncate",
            // Text color changes based on selection state and dark mode
            isSelected ? "text-white" : "text-slate-700 dark:text-slate-200",
            minimized && "sr-only" // Hidden when sidebar is minimized
          )}
        >
          {user.firstName} {user.lastName}
        </p>

        {/* Indicator/Chevron - subtle micro-interaction on hover */}
        {!minimized && (
            <ChevronRight 
                className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isSelected 
                        ? "text-white rotate-90" // Rotated and white when selected
                        : "text-slate-400 group-hover:text-slate-600" // Subtle gray normally
                )}
            />
        )}
      </button>

      {/* Task List Component: Only shows if selected and sidebar is NOT minimized */}
      {isSelected && !minimized && (
        <div className="mt-2 pl-4 border-l-2 border-[#00b8b0]/50 dark:border-[#0098da]/50 transition-all duration-300">
            <UserTaskList user={user} />
        </div>
      )}
    </>
  );
}
