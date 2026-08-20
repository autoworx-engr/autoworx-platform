"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import {
  CALENDAR_SIDEBAR_EXPAND_BREAKPOINT,
  useCalendarSidebarStore,
} from "@/stores/calendarSidebar";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import CollapsedRail from "./CollapsedRail";
import Tasks from "./Tasks";
import Users from "./Users";

const triggerClassName = cn(
  "relative flex-1 gap-2.5 rounded-lg px-3 py-2 text-base font-medium text-slate-500 transition-all duration-300 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
  "data-[state=active]:translate-y-[-1px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-[#5a66ee] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/25 data-[state=active]:ring-1 data-[state=active]:ring-black/5",
);

export default function CalendarSidebar() {
  const { type, minimized, setType, applyViewportDefault } =
    useCalendarSidebarStore();
  const sessionUser = useSession();
  const isAdminOrManager =
    sessionUser.data?.user?.employeeType === "Admin" ||
    sessionUser.data?.user?.employeeType === "Manager";

  const isWideScreen = useMediaQuery(
    `(min-width: ${CALENDAR_SIDEBAR_EXPAND_BREAKPOINT}px)`,
  );

  // Wide screens fit the calendar and the panel side by side, so the panel is
  // open there by default; narrower ones start on the rail. Once the user
  // toggles it themselves the store ignores this.
  useEffect(() => {
    applyViewportDefault(!isWideScreen);
  }, [isWideScreen, applyViewportDefault]);

  return (
    <div
      className={cn(
        "hidden h-full flex-col transition-[width,min-width,max-width] duration-300 ease-out md:flex",
        minimized
          ? "md:w-12 md:min-w-12 md:max-w-12 md:shrink-0"
          : "overflow-x-clip md:w-[20%] md:min-w-[300px] md:max-w-[320px] md:shrink-0",
      )}
    >
      {minimized ? (
        <CollapsedRail showUsers={isAdminOrManager} />
      ) : (
        <Tabs
          value={type}
          onValueChange={(value) => setType(value as "USERS" | "TASKS")}
          className="flex h-full min-h-0 flex-grow flex-col"
        >
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
          <TabsContent
            value="USERS"
            className="mt-2 flex min-h-0 flex-1 flex-grow flex-col data-[state=inactive]:hidden"
          >
            <Users />
          </TabsContent>
          <TabsContent
            value="TASKS"
            className="mt-2 flex min-h-0 flex-1 flex-grow flex-col data-[state=inactive]:hidden"
          >
            <Tasks />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
