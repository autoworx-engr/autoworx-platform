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
        minimized ? "w-8" : "w-[20%] max-[1300px]:w-[300px] 2xl:w-[370px]",
      )}
    >
      <Heading />
      <Body />
    </div>
  );
}
