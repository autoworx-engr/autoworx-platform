import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { ClickupTask, ReportGranularity } from "@/types/clickup";

export function toDate(value: string | null): Date | null {
  if (!value) return null;
  const ms = Number(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function isCompletedStatus(type: string): boolean {
  const normalized = type.toLowerCase();
  return normalized === "closed" || normalized === "done";
}

export function completedAt(task: ClickupTask): Date | null {
  if (!isCompletedStatus(task.status.type)) return null;
  return toDate(task.date_closed) ?? toDate(task.date_done);
}

export function createdAt(task: ClickupTask): Date | null {
  return toDate(task.date_created);
}

export function bucketStart(date: Date, granularity: ReportGranularity): Date {
  if (granularity === "day") return startOfDay(date);
  if (granularity === "week") return startOfWeek(date);
  return startOfMonth(date);
}

export function bucketLabel(
  date: Date,
  granularity: ReportGranularity,
): string {
  if (granularity === "month") return format(date, "MMM yyyy");
  return format(date, "MMM d");
}

export function bucketKeys(
  start: Date,
  end: Date,
  granularity: ReportGranularity,
): Date[] {
  if (granularity === "day") return eachDayOfInterval({ start, end });
  if (granularity === "week")
    return eachWeekOfInterval({ start, end }).map((d) => startOfWeek(d));
  return eachMonthOfInterval({ start, end }).map((d) => startOfMonth(d));
}

/** How many tasks were open (created, not yet completed) at the given instant. */
export function backlogAsOf(tasks: ClickupTask[], instant: Date): number {
  let count = 0;
  for (const task of tasks) {
    const created = createdAt(task);
    if (!created || created > instant) continue;
    const done = completedAt(task);
    if (!done || done > instant) count += 1;
  }
  return count;
}
