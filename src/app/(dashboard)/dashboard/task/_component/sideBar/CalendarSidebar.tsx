"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import {
  CALENDAR_SIDEBAR_EXPAND_BREAKPOINT,
  useCalendarSidebarStore,
} from "@/stores/calendarSidebar";
import { useEffect } from "react";
import CollapsedRail from "./CollapsedRail";
import SidePanelTabs from "./SidePanelTabs";
import { useIsAdminOrManager } from "./useIsAdminOrManager";

export default function CalendarSidebar() {
  const minimized = useCalendarSidebarStore((x) => x.minimized);
  const applyViewportDefault = useCalendarSidebarStore(
    (x) => x.applyViewportDefault,
  );
  const isAdminOrManager = useIsAdminOrManager();

  const isWideScreen = useMediaQuery(
    `(min-width: ${CALENDAR_SIDEBAR_EXPAND_BREAKPOINT}px)`,
  );

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
        <SidePanelTabs />
      )}
    </div>
  );
}
