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
        "rounded-lg p-2  transition-transform ease-in hover:bg-gray-300",
        minimized
          ? "mx-auto rotate-180 border border-slate-200 bg-white/50 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50"
          : "rotate-0",
      )}
    >
      <ArrowLeftFromLine size={18} />
    </button>
  );
}
