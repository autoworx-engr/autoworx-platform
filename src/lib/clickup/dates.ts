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

/** Status labels that mean "done" for reporting purposes even though ClickUp
 * itself doesn't mark them as a closed/done status type (e.g. handoff stages
 * like "Dev Done" or "QA Check" — the dev's part of the bug is finished). */
const EXTRA_COMPLETED_STATUS_LABELS = ["dev done", "qa check"];

export function isCompletedStatus(status: {
  status: string;
  type: string;
}): boolean {
  const normalizedType = status.type.toLowerCase();
  if (normalizedType === "closed" || normalizedType === "done") return true;
  return EXTRA_COMPLETED_STATUS_LABELS.includes(
    status.status.trim().toLowerCase(),
  );
}

export function completedAt(task: ClickupTask): Date | null {
  if (!isCompletedStatus(task.status)) return null;
  return (
    toDate(task.date_closed) ??
    toDate(task.date_done) ??
    toDate(task.date_updated)
  );
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
