"use client";

import { cn } from "@/lib/cn.ts";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar.ts";
import { useSession } from "next-auth/react";

export default function Heading() {
  const { type, minimized, setType } = useCalendarSidebarStore();
  const sessionUser = useSession();
  const isAdminOrManager =
    sessionUser.data?.user?.employeeType === "Admin" ||
    sessionUser.data?.user?.employeeType === "Manager";

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm p-1.5">
      {!minimized && (
        <>
          {isAdminOrManager && (
            <button
              type="button"
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out",
                type === "USERS"
                  ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              )}
              onClick={() => setType("USERS")}
            >
              {type === "USERS" && <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6571FF] to-[#5a66ee] -z-10" />}
              Users
            </button>
          )}
          <button
            type="button"
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out",
              type === "TASKS"
                ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
            onClick={() => setType("TASKS")}
          >
            {type === "TASKS" && <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6571FF] to-[#5a66ee] -z-10" />}
            Tasks
          </button>
        </>
      )}
    </div>
  );
}
