import type { Prisma } from "@prisma/client";
import moment from "moment-timezone";

/**
 * Dashboard task lists only show what is still ahead: every task from tomorrow
 * onwards, plus today's tasks that are all-day or whose start time has not
 * passed yet.
 *
 * `Task.date` is stored at UTC midnight for the calendar day it belongs to, so
 * the day boundaries are built from the company-local date read as UTC rather
 * than from an instant. `startTime` is a plain "HH:mm" string, compared against
 * the company-local clock.
 */
export function getUpcomingTaskDateFilter(
  timezone: string,
): Prisma.TaskWhereInput {
  const nowTz = moment.tz(timezone);
  const todayLocalDate = nowTz.format("YYYY-MM-DD");

  const todayStart = moment.utc(todayLocalDate).toDate();
  const tomorrowStart = moment.utc(todayLocalDate).add(1, "day").toDate();
  const currentTime = nowTz.format("HH:mm");

  return {
    OR: [
      { date: { gte: tomorrowStart } },
      {
        AND: [
          { date: { gte: todayStart } },
          { date: { lt: tomorrowStart } },
          {
            OR: [
              { startTime: null },
              { startTime: "" },
              { startTime: { gte: currentTime } },
            ],
          },
        ],
      },
    ],
  };
}
