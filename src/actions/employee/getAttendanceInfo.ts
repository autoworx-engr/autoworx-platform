"use server";

import { db } from "@/lib/db";
import moment, { Moment } from "moment-timezone";
import { getCompany } from "../settings/getCompany";

interface GrowthRate {
  rate: string;
  isPositive: boolean | null;
}
interface AttendanceRecord {
  id?: number;
  date: Date;
  clockedIn: Date | string;
  clockedOut: Date | string;
  hours: string;
  extraHours: string;
  totalBreaks: string;
  workedMinutes: number;
  extraMinutes: number;
  breakMinutes: number;
  dayType?: "WEEKEND";
}

interface AttendanceInfo {
  attInfo: AttendanceRecord[];
  absentDays: number;
  totalExtraHours: string;
  totalHoursWorked: string;
  totalDaysWorked: number;
  previousAbsentDays: number;
  previousTotalExtraHours: string;
  previousTotalHoursWorked: string;
  previousTotalDaysWorked: number;
  growthRateAbsentDays: GrowthRate;
  growthRateTotalExtraHours: GrowthRate;
  growthRateTotalHoursWorked: GrowthRate;
  growthRateTotalDaysWorked: GrowthRate;
  totalTardiness: string;
  previousTotalTardiness: string;
  growthRateTotalTardiness: GrowthRate;
  noShowRate: string;
  previousNoShowRate: string;
  growthRateNoShowRate: GrowthRate;
}

// Accept startDateParam and endDateParam as optional parameters
export async function getAttendanceInfo(
  id: number,
  startDateParam?: string,
  endDateParam?: string,
): Promise<AttendanceInfo> {
  // Fetch company information
  const company = await getCompany();

  // Fetch user information along with related data
  const user = await db.user.findUnique({
    where: { id },
    include: {
      Technician: {
        include: {
          invoice: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
      },
      ClockInOut: {
        include: {
          ClockBreak: true,
        },
      },
      LeaveRequest: true,
    },
  });

  // Fetch calendar settings for the company
  const calendarSettings = await db.calendarSettings.findFirst({
    where: {
      companyId: company?.id,
    },
  });

  // Throw an error if user or calendar settings are not found
  if (!user || !calendarSettings) {
    throw new Error("User or calendar settings not found");
  }

  // Get the company timezone for consistent date processing
  const companyTimezone = company?.timezone || "UTC";
  const now = moment(); // Current date and time in company timezone
  const standardWorkingHours = 8; // Standard working hours per day

  const startDate = moment.tz(startDateParam, companyTimezone).toDate();

  const endDate = moment.tz(endDateParam, companyTimezone).toDate();

  const holidays = await db.holiday.findMany({
    where: {
      companyId: company?.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Helper function to get attendance info for a given date range
  const getAttendanceInfoForRange = (
    startDate: Moment,
    endDate: Moment,
  ): AttendanceRecord[] => {
    const records: AttendanceRecord[] = [];

    // ---------- CLOCK MAP ----------
    const clockMap = new Map<string, (typeof user.ClockInOut)[0]>();

    user.ClockInOut.forEach((clock) => {
      const key = moment
        .utc(clock.clockIn)
        .tz(companyTimezone)
        .format("YYYY-MM-DD");

      clockMap.set(key, clock);
    });

    // ---------- APPROVED LEAVES ----------
    const approvedLeaves = user.LeaveRequest.filter(
      (leave) => leave.status === "Approved",
    );

    // ---------- HOLIDAYS ----------
    const startRange = moment().subtract(1, "month").startOf("month").toDate();

    const endRange = moment().endOf("month").toDate();

    const holidayMap = new Set(
      holidays.map((h) => moment(h.date).format("YYYY-MM-DD")),
    );

    for (
      let date = startDate.clone();
      date.isSameOrBefore(endDate, "day");
      date.add(1, "day")
    ) {
      const dayKey = date.format("YYYY-MM-DD");
      const dayName = date.format("dddd").toLowerCase();

      // NOT JOINED
      if (user.joinDate && date.isBefore(moment(user.joinDate), "day")) {
        records.push(createAttendanceRecord(date, "NOT_JOINED"));
        continue;
      }

      // FUTURE
      if (date.isAfter(now, "day") && !clockMap.has(dayKey)) {
        records.push(createAttendanceRecord(date, "-"));
        continue;
      }

      // WEEKEND (keep the clock data when the employee actually worked)
      const isWeekend =
        dayName === calendarSettings.weekend1.toLowerCase() ||
        dayName === calendarSettings.weekend2.toLowerCase();

      if (isWeekend && !clockMap.has(dayKey)) {
        records.push(createAttendanceRecord(date, "WEEKEND"));
        continue;
      }

      // HOLIDAY
      if (!isWeekend && holidayMap.has(dayKey)) {
        records.push(createAttendanceRecord(date, "HOLIDAY"));
        continue;
      }

      // LEAVE
      const onLeave = approvedLeaves.some((leave) =>
        date.isBetween(
          moment(leave.startDate),
          moment(leave.endDate),
          "day",
          "[]",
        ),
      );

      if (!isWeekend && onLeave) {
        records.push(createAttendanceRecord(date, "LEAVE"));
        continue;
      }

      // CLOCK DATA
      const clock = clockMap.get(dayKey);
      if (clock) {
        const breakMinutes = clock.ClockBreak.reduce((sum, b) => {
          if (!b.breakEnd) return sum;
          return sum + moment(b.breakEnd).diff(moment(b.breakStart), "minutes");
        }, 0);

        const workedMinutes = clock.clockOut
          ? moment(clock.clockOut).diff(moment(clock.clockIn), "minutes")
          : moment().diff(moment(clock.clockIn), "minutes"); //  use current time if still clocked in

        const workedHours = (workedMinutes / 60).toFixed(2);
        const extraMinutes =
          workedMinutes > standardWorkingHours * 60
            ? workedMinutes - standardWorkingHours * 60
            : 0;
        const extraHours = (extraMinutes / 60).toFixed(2);

        records.push({
          id: clock.id,
          // same shape as createAttendanceRecord so the table renders one day label for both
          date: new Date(date.format("YYYY-MM-DD")),
          clockedIn: clock.clockIn,
          clockedOut: clock.clockOut ?? "N/A",
          hours: workedHours,
          extraHours,
          totalBreaks: (breakMinutes / 60).toFixed(2),
          workedMinutes,
          extraMinutes,
          breakMinutes,
          ...(isWeekend ? { dayType: "WEEKEND" as const } : {}),
        });
      } else {
        records.push(createAttendanceRecord(date, "ABSENT"));
      }
    }

    return records;
  };

  // Helper function to create an attendance record
  const createAttendanceRecord = (
    date: Moment,
    status: string,
  ): AttendanceRecord => ({
    date: new Date(date.format("YYYY-MM-DD")),
    clockedIn: status,
    clockedOut: status,
    hours: status,
    extraHours: status,
    totalBreaks: status,
    workedMinutes: 0,
    extraMinutes: 0,
    breakMinutes: 0,
  });

  // Use provided dates if available, otherwise use default (current week)
  let startOfWeek: Moment = moment().startOf("week");
  let endOfWeek: Moment = moment().endOf("week");

  if (startDateParam && endDateParam) {
    startOfWeek = moment.tz(startDateParam, companyTimezone); // Moment, time = 00:00
    endOfWeek = moment.tz(endDateParam, companyTimezone);
  } else {
    // Use current week in company timezone
    startOfWeek = moment().startOf("week");
    endOfWeek = moment().endOf("week");
  }

  const attInfo = await getAttendanceInfoForRange(startOfWeek, endOfWeek);

  const rangeDurationDays = endOfWeek.diff(startOfWeek, "days");
  const prevPeriodEnd = startOfWeek.clone().subtract(1, "day");
  const prevPeriodStart = prevPeriodEnd
    .clone()
    .subtract(rangeDurationDays, "days");
  const attInfoPrevPeriod = await getAttendanceInfoForRange(
    prevPeriodStart,
    prevPeriodEnd,
  );

  // Get current monthly attendance information using company timezone
  const startOfMonth = moment().startOf("month");
  const endOfMonth = moment().endOf("month");

  const attInfoMonth = await getAttendanceInfoForRange(
    startOfMonth,
    endOfMonth,
  );

  // Get previous monthly attendance information using company timezone
  const startOfPrevMonth = moment().subtract(1, "month").startOf("month");
  const endOfPrevMonth = moment().subtract(1, "month").endOf("month");
  const attInfoPrevMonth = await getAttendanceInfoForRange(
    startOfPrevMonth,
    endOfPrevMonth,
  );

  // Calculate the number of days absent after the user's join date
  const absentDays = attInfo.filter(
    (day) =>
      day.clockedIn === "ABSENT" &&
      moment(day.date).isSameOrAfter(moment(user.joinDate), "day"),
  ).length;

  const previousAbsentDays = attInfoPrevPeriod.filter(
    (day) =>
      day.clockedIn === "ABSENT" &&
      moment(day.date).isSameOrAfter(moment(user.joinDate), "day"),
  ).length;

  // Calculate the total extra hours for the selected period
  const totalExtraHours = (
    attInfo.reduce((total, day) => total + day.extraMinutes, 0) / 60
  ).toFixed(2);
  const previousTotalExtraHours = (
    attInfoPrevPeriod.reduce((total, day) => total + day.extraMinutes, 0) / 60
  ).toFixed(2);

  const totalHoursWorked = (
    attInfo.reduce(
      (total, day) => total + (day.workedMinutes - day.breakMinutes),
      0,
    ) / 60
  ).toFixed(2);

  const previousTotalHoursWorked = (
    attInfoPrevPeriod.reduce(
      (total, day) => total + (day.workedMinutes - day.breakMinutes),
      0,
    ) / 60
  ).toFixed(2);

  const totalDaysWorked = attInfo.filter(
    (day) =>
      day.hours !== "ABSENT" &&
      day.hours !== "WEEKEND" &&
      day.hours !== "LEAVE" &&
      day.hours !== "-" &&
      day.hours !== "NOT_JOINED",
  ).length;
  const previousTotalDaysWorked = attInfoPrevPeriod.filter(
    (day) =>
      day.hours !== "ABSENT" &&
      day.hours !== "WEEKEND" &&
      day.hours !== "LEAVE" &&
      day.hours !== "-" &&
      day.hours !== "NOT_JOINED",
  ).length;
  // Calculate growth rates
  const calculateGrowthRate = (
    current: number,
    previous: number,
  ): GrowthRate => {
    if (previous === 0) return { rate: "N/A", isPositive: null };
    const growth = ((current - previous) / previous) * 100;
    return {
      rate: growth.toFixed(2) + "%",
      isPositive: growth >= 0,
    };
  };

  // Update the growth rate calculations
  const growthRateAbsentDays = calculateGrowthRate(
    absentDays,
    previousAbsentDays,
  );
  const growthRateTotalExtraHours = calculateGrowthRate(
    parseFloat(totalExtraHours),
    parseFloat(previousTotalExtraHours),
  );
  const growthRateTotalHoursWorked = calculateGrowthRate(
    parseFloat(totalHoursWorked),
    parseFloat(previousTotalHoursWorked),
  );

  const growthRateTotalDaysWorked = calculateGrowthRate(
    totalDaysWorked,
    previousTotalDaysWorked,
  );

  // Calculate total tardiness for the selected period
  const totalTardiness = (
    user.Technician.reduce((total, technician) => {
      if (technician.dateClosed && technician.due) {
        const dateClosed = moment(technician.dateClosed);
        const due = moment(technician.due);
        if (
          dateClosed.isSameOrAfter(startOfWeek) &&
          dateClosed.isSameOrBefore(endOfWeek)
        ) {
          const tardiness = dateClosed.diff(due, "minutes");
          return total + tardiness;
        }
      }
      return total;
    }, 0) / 60
  ).toFixed(2);

  // Calculate total tardiness for the previous period
  const previousTotalTardiness = (
    user.Technician.reduce((total, technician) => {
      if (technician.dateClosed && technician.due) {
        const dateClosed = moment(technician.dateClosed);
        const due = moment(technician.due);
        if (
          dateClosed.isSameOrAfter(prevPeriodStart) &&
          dateClosed.isSameOrBefore(prevPeriodEnd)
        ) {
          const tardiness = dateClosed.diff(due, "minutes");
          return total + tardiness;
        }
      }
      return total;
    }, 0) / 60
  ).toFixed(2);

  // Calculate growth rate for tardiness
  const growthRateTotalTardiness = calculateGrowthRate(
    parseFloat(totalTardiness),
    parseFloat(previousTotalTardiness),
  );

  // Calculate total hours absent for the selected period
  const totalHoursAbsent = attInfo
    .filter((day) => day.clockedIn === "ABSENT")
    .reduce((total, day) => total + standardWorkingHours, 0);

  // Calculate total hours absent for the previous period
  const previousTotalHoursAbsent = attInfoPrevPeriod
    .filter((day) => day.clockedIn === "ABSENT")
    .reduce((total, day) => total + standardWorkingHours, 0);

  // Calculate "No Show" rate for the current month
  const noShowRate =
    parseFloat(totalHoursWorked) > 0
      ? ((totalHoursAbsent / parseFloat(totalHoursWorked)) * 100).toFixed(2)
      : "0.00";

  // Calculate "No Show" rate for the previous month
  const previousNoShowRate =
    parseFloat(previousTotalHoursWorked) > 0
      ? (
          (previousTotalHoursAbsent / parseFloat(previousTotalHoursWorked)) *
          100
        ).toFixed(2)
      : "0.00";

  // Calculate growth rate for "No Show" rate
  const growthRateNoShowRate = calculateGrowthRate(
    parseFloat(noShowRate),
    parseFloat(previousNoShowRate),
  );

  return {
    attInfo,
    absentDays,
    totalExtraHours,
    totalHoursWorked,
    totalDaysWorked,
    previousAbsentDays,
    previousTotalExtraHours,
    previousTotalHoursWorked,
    previousTotalDaysWorked,
    growthRateAbsentDays,
    growthRateTotalExtraHours,
    growthRateTotalHoursWorked,
    growthRateTotalDaysWorked,
    totalTardiness,
    previousTotalTardiness,
    growthRateTotalTardiness,
    noShowRate,
    previousNoShowRate,
    growthRateNoShowRate,
  };
}
