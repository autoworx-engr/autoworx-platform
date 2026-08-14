import { differenceInMilliseconds } from "date-fns";
import {
  bumpBreakdown,
  bumpLeaderboard,
  foldBreakdown,
  orderedPriorityBreakdown,
  pctDelta,
  topEntries,
} from "@/lib/clickup/aggregate";
import {
  backlogAsOf,
  bucketKeys,
  bucketLabel,
  bucketStart,
  completedAt,
  createdAt,
  isCompletedStatus,
} from "@/lib/clickup/dates";
import type {
  BreakdownSlice,
  ClickupBugSummary,
  ClickupTask,
  FilterableUser,
  LeaderboardEntry,
  ReportGranularity,
  TrendBucket,
} from "@/types/clickup";

function collectAssignableUsers(tasks: ClickupTask[]): FilterableUser[] {
  const map = new Map<number, FilterableUser>();
  for (const task of tasks) {
    for (const user of [task.creator, ...task.assignees]) {
      if (!map.has(user.id)) {
        map.set(user.id, {
          id: user.id,
          name: user.username ?? user.email ?? `User ${user.id}`,
          color: user.color,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeClickupTasks(
  allTasks: ClickupTask[],
  range: { start: Date; end: Date },
  granularity: ReportGranularity,
  assigneeFilter: number[] = [],
): ClickupBugSummary {
  const assignableUsers = collectAssignableUsers(allTasks);

  const filterSet = new Set(assigneeFilter);
  const tasks =
    filterSet.size === 0
      ? allTasks
      : allTasks.filter((t) => t.assignees.some((a) => filterSet.has(a.id)));

  const rangeDurationMs = differenceInMilliseconds(range.end, range.start);
  const previousEnd = new Date(range.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - rangeDurationMs);

  const buckets = new Map<string, TrendBucket>();
  for (const key of bucketKeys(range.start, range.end, granularity)) {
    const start = bucketStart(key, granularity);
    buckets.set(start.toISOString(), {
      key: start.toISOString(),
      label: bucketLabel(start, granularity),
      created: 0,
      completed: 0,
      backlog: 0,
    });
  }
  for (const bucket of buckets.values()) {
    bucket.backlog = backlogAsOf(
      tasks,
      new Date(new Date(bucket.key).getTime() + 86_400_000 - 1),
    );
  }

  const creators = new Map<number, LeaderboardEntry>();
  const completers = new Map<number, LeaderboardEntry>();
  const statusCounts = new Map<string, BreakdownSlice>();
  const priorityCounts = new Map<string, BreakdownSlice>();

  let totalCreated = 0;
  let totalCompleted = 0;
  let totalOpen = 0;
  let previousCreated = 0;
  let previousCompleted = 0;
  let resolutionHoursSum = 0;
  let resolutionCount = 0;

  for (const task of tasks) {
    if (!isCompletedStatus(task.status.type)) {
      totalOpen += 1;
      bumpBreakdown(statusCounts, task.status.status, task.status.status);
      const priorityKey = task.priority?.priority ?? "none";
      bumpBreakdown(
        priorityCounts,
        priorityKey,
        priorityKey === "none" ? "No priority" : priorityKey,
      );
    }

    const created = createdAt(task);
    if (created) {
      if (created >= range.start && created <= range.end) {
        totalCreated += 1;
        const bucket = buckets.get(
          bucketStart(created, granularity).toISOString(),
        );
        if (bucket) bucket.created += 1;
        bumpLeaderboard(
          creators,
          task.creator.id,
          task.creator.username ?? task.creator.email ?? "",
          task.creator.color,
        );
      } else if (created >= previousStart && created <= previousEnd) {
        previousCreated += 1;
      }
    }

    const done = completedAt(task);
    if (done) {
      if (done >= range.start && done <= range.end) {
        totalCompleted += 1;
        const bucket = buckets.get(
          bucketStart(done, granularity).toISOString(),
        );
        if (bucket) bucket.completed += 1;
        for (const assignee of task.assignees) {
          bumpLeaderboard(
            completers,
            assignee.id,
            assignee.username ?? assignee.email ?? "",
            assignee.color,
          );
        }
        if (created) {
          resolutionHoursSum +=
            differenceInMilliseconds(done, created) / 3_600_000;
          resolutionCount += 1;
        }
      } else if (done >= previousStart && done <= previousEnd) {
        previousCompleted += 1;
      }
    }
  }

  const openAtStart = backlogAsOf(tasks, new Date(range.start.getTime() - 1));

  return {
    totalCreated,
    totalCompleted,
    totalOpen,
    netChange: totalCreated - totalCompleted,
    avgResolutionHours: resolutionCount
      ? resolutionHoursSum / resolutionCount
      : null,
    previous: {
      totalCreated: previousCreated,
      totalCompleted: previousCompleted,
    },
    deltas: {
      createdPct: pctDelta(totalCreated, previousCreated),
      completedPct: pctDelta(totalCompleted, previousCompleted),
      openAtStart,
    },
    trend: Array.from(buckets.values()),
    statusBreakdown: foldBreakdown(statusCounts, 5),
    priorityBreakdown: orderedPriorityBreakdown(priorityCounts),
    topCreators: topEntries(creators),
    topCompleters: topEntries(completers),
    assignableUsers,
  };
}
