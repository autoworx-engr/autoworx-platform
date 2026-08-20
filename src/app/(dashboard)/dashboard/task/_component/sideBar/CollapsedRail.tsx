"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import {
  ListChecks,
  LucideIcon,
  PanelLeftOpen,
  Users as UsersIcon,
} from "lucide-react";

type RailButtonProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

function RailButton({ label, icon: Icon, active, onClick }: RailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60",
            active
              ? "bg-gradient-to-br from-primary to-[#5a66ee] text-white shadow-md shadow-primary/30"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          )}
        >
          <Icon size={18} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The narrow strip shown when the calendar side panel is collapsed. Doubles as
 * a shortcut bar: each icon expands the panel straight onto that tab.
 */
export default function CollapsedRail({ showUsers }: { showUsers: boolean }) {
  const type = useCalendarSidebarStore((x) => x.type);
  const setType = useCalendarSidebarStore((x) => x.setType);
  const setMinimized = useCalendarSidebarStore((x) => x.setMinimized);

  const expand = () => setMinimized(false);

  function openTab(next: "TASKS" | "USERS") {
    setType(next);
    setMinimized(false);
  }

  return (
    <div className="md:app-shadow flex h-full w-full flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-background py-3 dark:border-slate-800">
      <RailButton label="Expand panel" icon={PanelLeftOpen} onClick={expand} />

      <span className="my-1.5 h-px w-6 shrink-0 bg-slate-200 dark:bg-slate-800" />

      <RailButton
        label="Task list"
        icon={ListChecks}
        active={type === "TASKS"}
        onClick={() => openTab("TASKS")}
      />
      {showUsers && (
        <RailButton
          label="User list"
          icon={UsersIcon}
          active={type === "USERS"}
          onClick={() => openTab("USERS")}
        />
      )}

      {/* Fills the otherwise blank strip and names the panel it opens. */}
      <button
        type="button"
        onClick={expand}
        aria-label="Expand panel"
        className="mt-auto flex flex-1 items-center justify-center rounded-lg text-[11px] font-semibold uppercase tracking-widest text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-primary/60 dark:text-slate-600 dark:hover:text-slate-400"
      >
        <span className="[writing-mode:vertical-rl]">Task Panel</span>
      </button>
    </div>
  );
}
