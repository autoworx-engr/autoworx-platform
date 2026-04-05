"use client";

import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import Heading from "./Heading";
import Body from "./Body";

export default function CalendarSidebar() {
  const minimized = useCalendarSidebarStore((x) => x.minimized);

  return (
    <div
      className={cn(
        "hidden flex-col overflow-x-clip transition-[width] ease-in md:flex",
        minimized
          ? "md:w-8 md:min-w-8 md:max-w-8"
          : "md:w-[20%] md:min-w-[300px] md:max-w-[320px] md:shrink-0",
      )}
    >
      <Heading />
      <Body />
    </div>
  );
}
