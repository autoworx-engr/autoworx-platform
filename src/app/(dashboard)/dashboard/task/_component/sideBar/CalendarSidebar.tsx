"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { useSession } from "next-auth/react";
import Tasks from "./Tasks";
import Users from "./Users";

const triggerClassName = cn(
  "relative flex-1 gap-2.5 rounded-lg px-3 py-2 text-base font-medium text-slate-500 transition-all duration-300 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
  "data-[state=active]:translate-y-[-1px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-[#5a66ee] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/25 data-[state=active]:ring-1 data-[state=active]:ring-black/5",
);

export default function CalendarSidebar() {
  const { type, minimized, setType } = useCalendarSidebarStore();
  const sessionUser = useSession();
  const isAdminOrManager =
    sessionUser.data?.user?.employeeType === "Admin" ||
    sessionUser.data?.user?.employeeType === "Manager";

  return (
    <div
      className={cn(
        "hidden h-full flex-col overflow-x-clip transition-[width] ease-in md:flex",
        minimized
          ? "md:w-10 md:min-w-10 md:max-w-10"
          : "md:w-[20%] md:min-w-[300px] md:max-w-[320px] md:shrink-0",
      )}
    >
      <Tabs
        value={type}
        onValueChange={(value) => setType(value as "USERS" | "TASKS")}
        className={cn(
          "flex min-h-0 h-full flex-col",
          !minimized && "flex-grow",
        )}
      >
        {!minimized && (
          <TabsList className="flex h-auto w-full items-center gap-2 rounded-xl border border-slate-200 bg-white/50 p-1.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
            {isAdminOrManager && (
              <TabsTrigger value="USERS" className={triggerClassName}>
                Users
              </TabsTrigger>
            )}
            <TabsTrigger value="TASKS" className={triggerClassName}>
              Tasks
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent
          value="USERS"
          className={cn(
            "mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden",
            !minimized && "flex-grow",
          )}
        >
          <Users />
        </TabsContent>
        <TabsContent
          value="TASKS"
          className={cn(
            "mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden",
            !minimized && "flex-grow",
          )}
        >
          <Tasks />
        </TabsContent>
      </Tabs>
    </div>
  );
}
