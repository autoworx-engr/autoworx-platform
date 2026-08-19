"use client";

import { clockIn } from "@/actions/dashboard/clockIn";
import { clockOut } from "@/actions/dashboard/clockOut";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { successToast } from "@/lib/toast";
import { ClockBreak, ClockInOut } from "@prisma/client";
import { ClockIcon } from "./attendance/AttendanceIcons";
import BreakButton from "./attendance/BreakButton";
import DayCompleteBanner from "./attendance/DayCompleteBanner";
import {
  formatDateToCustomString,
  formatToTimeString,
  getAttendanceState,
  getWorkedMinutes,
} from "./attendance/attendanceHelpers";
import {
  baseButtonClasses,
  disabledClasses,
  primaryGradient,
  successGradient,
} from "./attendance/attendanceStyles";

export {
  formatDateToCustomString,
  formatToTimeString,
} from "./attendance/attendanceHelpers";

type TAttendanceButtonsBoxProps = {
  lastClockInOut: (ClockInOut & { ClockBreak: ClockBreak[] }) | null;
};

export default function AttendanceButtonsBox({
  lastClockInOut,
}: TAttendanceButtonsBoxProps) {
  const companyTimezone = useCompanyTimezone();

  const { hasClockedOutToday, isOnBreak, isClockedIn, lastBreak, dayComplete } =
    getAttendanceState(lastClockInOut, companyTimezone);

  const canClockOut = isClockedIn && !isOnBreak && !hasClockedOutToday;

  const clockOutTitle = dayComplete
    ? "You already clocked out today"
    : isOnBreak
      ? "End your break before clocking out"
      : !isClockedIn
        ? "Clock in first to clock out"
        : "";

  return (
    <div
      className={`
        flex w-full flex-col gap-3 p-4
        rounded-2xl shadow-2xl dark:shadow-slate-900/50
        bg-white/70 dark:bg-slate-800/70
        ring-1 ring-slate-900/5 dark:ring-slate-700/50
        backdrop-blur-md
      `}
    >
      {dayComplete && lastClockInOut?.clockIn && lastClockInOut?.clockOut && (
        <DayCompleteBanner
          clockIn={new Date(lastClockInOut.clockIn)}
          clockOut={new Date(lastClockInOut.clockOut)}
          workedMinutes={getWorkedMinutes(lastClockInOut)}
          timezone={companyTimezone}
        />
      )}

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        {/* Clock-In Button */}
        <div className="w-full">
          <button
            onClick={async () => {
              if (dayComplete) return;

              if (!lastClockInOut || lastClockInOut?.clockOut) {
                const res = await clockIn({ timezone: companyTimezone });
                if (res.success) {
                  successToast("Clocked In Successfully");
                }
              }
            }}
            className={`${baseButtonClasses} ${
              dayComplete
                ? disabledClasses
                : isClockedIn
                  ? successGradient
                  : primaryGradient
            } 2xl:text-xl`}
            disabled={dayComplete}
            title={
              dayComplete
                ? "Today's shift is complete — clock-in opens again tomorrow"
                : ""
            }
          >
            {isClockedIn ? (
              <>
                <div className="flex items-center justify-center gap-2">
                  <ClockIcon className="h-5 w-5 animate-pulse" />
                  <span>Clocked-In</span>
                </div>
                <span className="mt-1 block text-xs font-light opacity-80">
                  {formatDateToCustomString(
                    new Date(lastClockInOut!.clockIn!),
                    companyTimezone,
                  )}
                </span>
              </>
            ) : (
              <>
                <span>Clock-In</span>
                {dayComplete && (
                  <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-300">
                    Done for today
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Clock-Out Button */}
        <div className="w-full">
          <button
            onClick={async () => {
              if (!canClockOut || !lastClockInOut) return;

              const res = await clockOut({
                clockInOutId: lastClockInOut.id,
                timezone: companyTimezone,
              });
              if (res.success) {
                successToast("Clocked Out Successfully");
              }
            }}
            className={`${baseButtonClasses} ${
              canClockOut ? primaryGradient : disabledClasses
            } 2xl:text-xl`}
            disabled={!canClockOut}
            title={clockOutTitle}
          >
            <span>Clock-Out</span>
            {dayComplete && lastClockInOut?.clockOut && (
              <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-300">
                at{" "}
                {formatToTimeString(
                  new Date(lastClockInOut.clockOut),
                  companyTimezone,
                )}
              </span>
            )}
          </button>
        </div>

        {/* Break / End Break Button */}
        <div className="w-full">
          <BreakButton
            lastClockInOut={lastClockInOut}
            lastBreak={lastBreak}
            isOnBreak={isOnBreak}
            isClockedIn={isClockedIn}
            dayComplete={dayComplete}
            timezone={companyTimezone}
          />
        </div>
      </div>
    </div>
  );
}
