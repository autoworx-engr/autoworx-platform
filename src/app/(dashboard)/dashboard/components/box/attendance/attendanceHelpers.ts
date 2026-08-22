import { ClockBreak, ClockInOut } from "@prisma/client";
import moment from "moment-timezone";

export type ClockInOutWithBreaks = ClockInOut & { ClockBreak: ClockBreak[] };

function resolveTimezone(timezone?: string) {
  return timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDateToCustomString(date: Date, timezone?: string) {
  return moment(date)
    .tz(resolveTimezone(timezone))
    .format("MMMM D, YYYY h:mm A");
}

export function formatToTimeString(date: Date, timezone?: string) {
  return moment(date).tz(resolveTimezone(timezone)).format("h:mm A");
}

export function formatWorkedDuration(minutes: number) {
  const safeMinutes = Math.max(Math.round(minutes), 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getLastBreak(lastClockInOut: ClockInOutWithBreaks | null) {
  if (!lastClockInOut?.ClockBreak?.length) return null;
  return (
    lastClockInOut.ClockBreak[lastClockInOut.ClockBreak.length - 1] ?? null
  );
}

export function getWorkedMinutes(lastClockInOut: ClockInOutWithBreaks | null) {
  if (!lastClockInOut?.clockIn || !lastClockInOut?.clockOut) return 0;

  const workedMinutes = moment(lastClockInOut.clockOut).diff(
    moment(lastClockInOut.clockIn),
    "minutes",
  );
  const breakMinutes = lastClockInOut.ClockBreak.reduce((sum, breakItem) => {
    if (!breakItem.breakEnd) return sum;
    return (
      sum +
      moment(breakItem.breakEnd).diff(moment(breakItem.breakStart), "minutes")
    );
  }, 0);

  return Math.max(workedMinutes - breakMinutes, 0);
}

export function getAttendanceState(
  lastClockInOut: ClockInOutWithBreaks | null,
  timezone: string,
) {
  const today = moment().tz(timezone);

  const hasClockedInToday = lastClockInOut?.clockIn
    ? moment.utc(lastClockInOut.clockIn).tz(timezone).isSame(today, "day")
    : false;

  const hasClockedOutToday = lastClockInOut?.clockOut
    ? moment.utc(lastClockInOut.clockOut).tz(timezone).isSame(today, "day")
    : false;

  const lastBreak = getLastBreak(lastClockInOut);
  const isOnBreak = Boolean(lastBreak && lastBreak.breakEnd === null);
  const isClockedIn = Boolean(
    lastClockInOut?.clockIn && !lastClockInOut?.clockOut,
  );

  return {
    hasClockedInToday,
    hasClockedOutToday,
    isOnBreak,
    isClockedIn,
    lastBreak,
    // clocked in and back out on the same day: nothing left to do until tomorrow
    dayComplete: hasClockedInToday && !isClockedIn,
  };
}
