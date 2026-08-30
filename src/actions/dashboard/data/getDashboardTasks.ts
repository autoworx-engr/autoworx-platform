"use server";

import { db } from "@/lib/db";
import { getUpcomingTaskDateFilter } from "@/utils/upcomingTaskFilter";
import type { Prisma, Task } from "@prisma/client";

/**
 * Task list behind the dashboard boxes, shared by the mobile analytics routes
 * and mirroring what `useTasksQueryForDashboard` fetches for the web:
 * pending tasks the user created or is assigned to, limited to the upcoming
 * ones, newest first.
 *
 * `totalTasks` counts every pending task in scope — not just the upcoming
 * slice — so it stays a workload figure rather than the length of the list.
 */
export async function getDashboardTasks({
  companyId,
  userId,
  timezone,
  take = 20,
}: {
  companyId: number;
  userId: number;
  timezone: string;
  take?: number;
}): Promise<{ tasks: Task[]; totalTasks: number }> {
  const scope: Prisma.TaskWhereInput = {
    companyId,
    status: "pending",
    OR: [{ userId }, { taskUser: { some: { userId } } }],
  };

  const [tasks, totalTasks] = await Promise.all([
    db.task.findMany({
      where: { AND: [scope, getUpcomingTaskDateFilter(timezone)] },
      orderBy: { createdAt: "desc" },
      take,
    }),
    db.task.count({ where: scope }),
  ]);

  return { tasks, totalTasks };
}
