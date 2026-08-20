"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import Tasks from "./Tasks";
import Users from "./Users";
import { useIsAdminOrManager } from "./useIsAdminOrManager";

const triggerClassName = cn(
  "relative flex-1 gap-2.5 rounded-lg px-3 py-2 text-base font-medium text-slate-500 transition-all duration-300 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
  "data-[state=active]:translate-y-[-1px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-[#5a66ee] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/25 data-[state=active]:ring-1 data-[state=active]:ring-black/5",
);

const contentClassName =
  "mt-2 flex min-h-0 flex-1 flex-grow flex-col data-[state=inactive]:hidden";

/**
 * Tasks / Users tabs — shared by the desktop side panel and the mobile sheet so
 * both stay on the same tab and the markup lives in one place.
 */
export default function SidePanelTabs() {
  const type = useCalendarSidebarStore((x) => x.type);
  const setType = useCalendarSidebarStore((x) => x.setType);
  const isAdminOrManager = useIsAdminOrManager();
  // Without the Users tab there is nothing to switch to, so never leave a
  // non-admin looking at an empty panel.
  const activeType = isAdminOrManager ? type : "TASKS";

  return (
    <Tabs
      value={activeType}
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

      <TabsContent value="USERS" className={contentClassName}>
        <Users />
      </TabsContent>
      <TabsContent value="TASKS" className={contentClassName}>
        <Tasks />
      </TabsContent>
    </Tabs>
  );
}
