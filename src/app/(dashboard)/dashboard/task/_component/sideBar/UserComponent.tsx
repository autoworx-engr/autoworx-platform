"use client";

import { cn } from "@/lib/cn";
import { User } from "@prisma/client";

import Avatar from "@/components/Avatar";
import { ChevronRight } from "lucide-react";
import UserTaskList from "./UserTaskList";

type TUserComponentProps = {
  isSelected: boolean;
  onSelect: () => void;
  user: User;
};

export default function UserComponent({
  isSelected,
  onSelect,
  user,
}: TUserComponentProps) {
  const baseClasses = cn(
    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
    "cursor-pointer transition-all duration-200 ease-in-out",
  );

  // Selected = brand gradient; idle = subtle card with brand-tinted hover.
  const interactiveClasses = isSelected
    ? "bg-gradient-to-r from-primary to-[#5a66ee] text-white shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50"
    : "bg-slate-50 ring-1 ring-transparent hover:bg-accent hover:ring-border dark:bg-slate-800 dark:hover:bg-slate-700/70";

  return (
    <>
      <button
        className={cn(baseClasses, interactiveClasses)}
        onClick={onSelect}
      >
        <Avatar photo={user.image} width={40} height={40} />

        <p
          className={cn(
            "flex-grow truncate text-left text-base font-semibold",
            isSelected ? "text-white" : "text-slate-700 dark:text-slate-200",
          )}
        >
          {user.firstName} {user.lastName}
        </p>

        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isSelected
              ? "rotate-90 text-white/90"
              : "text-slate-400 group-hover:text-slate-500",
          )}
        />
      </button>

      {isSelected && (
        <div className="mt-2 pl-4 border-l-2 border-primary/50 dark:border-[#5a66ee]/50 transition-all duration-300">
          <UserTaskList user={user} />
        </div>
      )}
    </>
  );
}
