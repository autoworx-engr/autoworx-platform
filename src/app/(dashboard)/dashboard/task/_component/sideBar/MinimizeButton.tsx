"use client";

import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { PanelLeftClose } from "lucide-react";

export function MinimizeButton() {
  const setMinimized = useCalendarSidebarStore((x) => x.setMinimized);
  return (
    <button
      type="button"
      onClick={() => setMinimized(true)}
      aria-label="Collapse panel"
      className="group relative rounded-lg p-2 text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <PanelLeftClose size={18} />
      <span className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block dark:bg-slate-100 dark:text-slate-900">
        Collapse panel
      </span>
    </button>
  );
}
