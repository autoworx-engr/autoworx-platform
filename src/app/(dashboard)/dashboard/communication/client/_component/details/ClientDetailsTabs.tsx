"use client";

import { cn } from "@/lib/cn";
import {
  CalendarClock,
  Car,
  FileText,
  ListChecks,
  Paperclip,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import { useClientCommunicationStore } from "@/stores/client-store";

type TabId =
  | "vehicle"
  | "notes"
  | "files"
  | "estimates"
  | "tasks"
  | "appointments";

type TProps = {
  vehicle: React.ReactNode;
  notes: React.ReactNode;
  files: React.ReactNode;
  estimates: React.ReactNode;
  tasks: React.ReactNode;
  appointments: React.ReactNode;
  counts: {
    vehicle: number;
    files: number;
    estimates: number;
    tasks: number;
    appointments: number;
  };
};

export default function ClientDetailsTabs({
  vehicle,
  notes,
  files,
  estimates,
  tasks,
  appointments,
  counts,
}: TProps) {
  const [active, setActive] = useState<TabId>("vehicle");
  const upcomingAppointmentCount = useClientCommunicationStore(
    (state) => state.upcomingAppointmentCount,
  );
  const pendingTaskCount = useClientCommunicationStore(
    (state) => state.pendingTaskCount,
  );
  const appointmentsCount = upcomingAppointmentCount ?? counts.appointments;
  const tasksCount = pendingTaskCount ?? counts.tasks;

  const tabs: {
    id: TabId;
    label: string;
    icon: React.ElementType;
    count?: number;
    // Flags a tab red when it needs attention — pending tasks or any
    // upcoming/current appointment — regardless of which tab is active.
    highlight?: boolean;
  }[] = [
    { id: "vehicle", label: "Vehicle", icon: Car, count: counts.vehicle },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "files", label: "Files", icon: Paperclip, count: counts.files },
    {
      id: "estimates",
      label: "Estimates",
      icon: Receipt,
      count: counts.estimates,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: ListChecks,
      count: tasksCount,
      highlight: tasksCount > 0,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: CalendarClock,
      count: appointmentsCount,
      highlight: appointmentsCount > 0,
    },
  ];

  const panels: { id: TabId; node: React.ReactNode }[] = [
    { id: "vehicle", node: vehicle },
    { id: "notes", node: notes },
    { id: "files", node: files },
    { id: "estimates", node: estimates },
    { id: "tasks", node: tasks },
    { id: "appointments", node: appointments },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab bar */}
      <div className="thin-scrollbar flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-100 px-4 pt-2 dark:border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              // aria-selected={isActive}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "border-[#006D77] text-[#006D77] dark:border-emerald-500 dark:text-emerald-500"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="relative inline-flex">
                  {tab.highlight && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 dark:bg-red-500" />
                  )}
                  <span
                    className={cn(
                      "relative rounded-full px-2 py-0.5 text-[9px] font-bold",
                      tab.highlight
                        ? "bg-red-500 text-white shadow-sm shadow-red-500/40 dark:bg-red-600"
                        : isActive
                          ? "bg-[#006D77]/10 text-[#006D77] dark:bg-emerald-900/20 dark:text-emerald-500"
                          : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400",
                    )}
                  >
                    {tab.count}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
        {panels.map((panel) => (
          <div
            key={panel.id}
            className={
              active === panel.id
                ? "thin-scrollbar min-h-0 flex-1 overflow-y-auto"
                : "hidden"
            }
          >
            {panel.node}
          </div>
        ))}
      </div>
    </div>
  );
}
