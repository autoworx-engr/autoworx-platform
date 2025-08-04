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
    <div className="calender-time-shadow flex min-h-8 items-center justify-center gap-2 rounded-[6px] bg-[#D9D9D9] p-0.5">
      {!minimized && (
        <>
          {isAdminOrManager && (
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[4px] text-[19px] text-[#797979] max-[1300px]:h-[30px] max-[1300px]:w-[90px] max-[1300px]:text-[17px]",
                type === "USERS" && "bg-background",
              )}
              onClick={() => setType("USERS")}
            >
              Users
            </button>
          )}
          <button
            type="button"
            className={cn(
              "flex-1 rounded-[4px] text-[19px] text-[#797979] max-[1300px]:h-[30px] max-[1300px]:w-[90px] max-[1300px]:text-[17px]",
              type === "TASKS" && "bg-background",
            )}
            onClick={() => setType("TASKS")}
          >
            Tasks
          </button>
        </>
      )}
    </div>
  );
}
