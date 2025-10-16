"use client";

import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { ArrowLeftFromLine } from "lucide-react";

export function MinimizeButton() {
  const minimized = useCalendarSidebarStore((x) => x.minimized);
  const toggleMinimized = useCalendarSidebarStore((x) => x.toggleMinimized);
  return (
    <button
      type="button"
      onClick={toggleMinimized}
      className={cn(
        "rounded-lg p-2 transition-transform ease-in hover:bg-gray-300",
        minimized ? "mx-auto rotate-180" : "rotate-0"
      )}
    >
      <ArrowLeftFromLine />
    </button>
  );
}
