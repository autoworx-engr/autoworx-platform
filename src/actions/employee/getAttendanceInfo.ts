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

  
  let rangeStart: Moment;
  let rangeEnd: Moment;

  if (startDateParam && endDateParam) {
    rangeStart = moment.tz(startDateParam, companyTimezone);
    rangeEnd = moment.tz(endDateParam, companyTimezone);
  } else {
    // Default to current month
    rangeStart = moment.tz(companyTimezone).startOf("month");
    rangeEnd = moment.tz(companyTimezone).endOf("month");
  }

  
  const rangeLength = rangeEnd.diff(rangeStart, "days") + 1;
  const prevRangeStart = rangeStart.clone().subtract(rangeLength, "days");
  const prevRangeEnd = rangeEnd.clone().subtract(rangeLength, "days");

 
  const holidays = await db.holiday.findMany({
    where: {
      companyId: company?.id,
      date: {
        gte: prevRangeStart.toDate(),
        lte: rangeEnd.toDate(),
      },
    },
  });


  const holidaySet = new Set(
    holidays.map((h) => moment(h.date).format("YYYY-MM-DD")),
  );

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

      // WEEKEND
      if (
        dayName === calendarSettings.weekend1.toLowerCase() ||
        dayName === calendarSettings.weekend2.toLowerCase()
      ) {
        records.push(createAttendanceRecord(date, "WEEKEND"));
        continue;
      }

      // HOLIDAY
      if (holidaySet.has(dayKey)) {
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

      if (onLeave) {
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
          : 0;

        const workedHours = (workedMinutes / 60).toFixed(2);
        const extraHours =
          workedMinutes / 60 > standardWorkingHours
            ? (workedMinutes / 60 - standardWorkingHours).toFixed(2)
            : "0";

        records.push({
          id: clock.id,
          date: date.clone().toDate(),
          clockedIn: clock.clockIn,
          clockedOut: clock.clockOut ?? "N/A",
          hours: workedHours,
          extraHours,
          totalBreaks: (breakMinutes / 60).toFixed(2),
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
  });

  // --- Fetch attendance data for current and previous range ---
  const attInfo = getAttendanceInfoForRange(rangeStart, rangeEnd);
  const attInfoPrev = getAttendanceInfoForRange(prevRangeStart, prevRangeEnd);


  const isWorkedDay = (day: AttendanceRecord) =>
    day.hours !== "ABSENT" &&
    day.hours !== "WEEKEND" &&
    day.hours !== "LEAVE" &&
    day.hours !== "HOLIDAY" &&
    day.hours !== "-" &&
    day.hours !== "NOT_JOINED";

  const isWorkedExtraHours = (day: AttendanceRecord) =>
    day.extraHours !== "ABSENT" &&
    day.extraHours !== "WEEKEND" &&
    day.extraHours !== "LEAVE" &&
    day.extraHours !== "HOLIDAY" &&
    day.extraHours !== "-";

  
  const absentDays = attInfo.filter(
    (day) =>
      day.clockedIn === "ABSENT" &&
      moment(day.date).isSameOrAfter(moment(user.joinDate), "day"),
  ).length;

  const totalExtraHours = attInfo
    .filter(isWorkedExtraHours)
    .reduce((total, day) => total + parseFloat(day.extraHours), 0)
    .toFixed(2);

  const totalHoursWorked = attInfo
    .filter(isWorkedDay)
    .reduce((total, day) => {
      const effectiveHours =
        parseFloat(day.hours) - parseFloat(day.totalBreaks);
      return total + effectiveHours;
    }, 0)
    .toFixed(2);

  const totalDaysWorked = attInfo.filter(isWorkedDay).length;

  
  const previousAbsentDays = attInfoPrev.filter(
    (day) =>
      day.clockedIn === "ABSENT" &&
      moment(day.date).isSameOrAfter(moment(user.joinDate), "day"),
  ).length;

  const previousTotalExtraHours = attInfoPrev
    .filter(isWorkedExtraHours)
    .reduce((total, day) => total + parseFloat(day.extraHours), 0)
    .toFixed(2);

  const previousTotalHoursWorked = attInfoPrev
    .filter(isWorkedDay)
    .reduce((total, day) => {
      const effectiveHours =
        parseFloat(day.hours) - parseFloat(day.totalBreaks);
      return total + effectiveHours;
    }, 0)
    .toFixed(2);

  const previousTotalDaysWorked = attInfoPrev.filter(isWorkedDay).length;

 
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

  
  const totalTardiness = (
    user.Technician.reduce((total, technician) => {
      if (technician.dateClosed && technician.due) {
        const dateClosed = moment(technician.dateClosed);
        const due = moment(technician.due);
        if (
          dateClosed.isSameOrAfter(rangeStart) &&
          dateClosed.isSameOrBefore(rangeEnd)
        ) {
          const tardiness = dateClosed.diff(due, "minutes");
          return total + tardiness;
        }
      }
      return total;
    }, 0) / 60
  ).toFixed(2);

  const previousTotalTardiness = (
    user.Technician.reduce((total, technician) => {
      if (technician.dateClosed && technician.due) {
        const dateClosed = moment(technician.dateClosed);
        const due = moment(technician.due);
        if (
          dateClosed.isSameOrAfter(prevRangeStart) &&
          dateClosed.isSameOrBefore(prevRangeEnd)
        ) {
          const tardiness = dateClosed.diff(due, "minutes");
          return total + tardiness;
        }
      }
      return total;
    }, 0) / 60
  ).toFixed(2);

  const growthRateTotalTardiness = calculateGrowthRate(
    parseFloat(totalTardiness),
    parseFloat(previousTotalTardiness),
  );

  
  const totalHoursAbsent = attInfo
    .filter((day) => day.clockedIn === "ABSENT")
    .reduce((total) => total + standardWorkingHours, 0);

  const previousTotalHoursAbsent = attInfoPrev
    .filter((day) => day.clockedIn === "ABSENT")
    .reduce((total) => total + standardWorkingHours, 0);

  const noShowRate =
    parseFloat(totalHoursWorked) > 0
      ? ((totalHoursAbsent / parseFloat(totalHoursWorked)) * 100).toFixed(2)
      : "0.00";

  const previousNoShowRate =
    parseFloat(previousTotalHoursWorked) > 0
      ? (
          (previousTotalHoursAbsent / parseFloat(previousTotalHoursWorked)) *
          100
        ).toFixed(2)
      : "0.00";

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
