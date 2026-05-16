import { Prisma } from "@prisma/client";
import moment from "moment-timezone";

export function buildUpcomingAppointmentFilter(
  timezone?: string | null,
): Prisma.AppointmentWhereInput {
  // `date` is stored as UTC midnight of the calendar date (see addAppointment.ts:
  // `new Date(appointment.date)` where appointment.date is "YYYY-MM-DD"). To match
  // the company's local "today", anchor the day boundary at UTC midnight of the
  // company-tz calendar date, not at company-tz midnight (which would be off by
  // the tz offset and exclude today's appointments in negative-UTC zones).
  const nowTz = moment.tz(timezone ?? "UTC");
  const todayStr = nowTz.format("YYYY-MM-DD");
  const todayStart = moment.utc(todayStr, "YYYY-MM-DD").toDate();
  const tomorrowStart = moment
    .utc(todayStr, "YYYY-MM-DD")
    .add(1, "day")
    .toDate();
  const currentTime = nowTz.format("HH:mm");

  return {
    OR: [
      { date: { gte: tomorrowStart } },
      {
        AND: [
          { date: { gte: todayStart, lt: tomorrowStart } },
          { OR: [{ endTime: null }, { endTime: { gte: currentTime } }] },
        ],
      },
      { endDate: { gte: todayStart } },
    ],
  };
}

export const upcomingAppointmentOrderBy: Prisma.AppointmentOrderByWithRelationInput[] =
  [{ date: "asc" }, { startTime: "asc" }];
