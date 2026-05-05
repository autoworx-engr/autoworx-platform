"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AppointmentStatus } from "./CalendarTab.types";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
    icon: XCircle,
  },
};

export default function CalendarStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const { label, bg, text, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}
