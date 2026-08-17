"use client";

import { stopBreak, takeBreak } from "@/actions/dashboard/break";
import { successToast } from "@/lib/toast";
import { ClockBreak } from "@prisma/client";
import { ClockIcon } from "./AttendanceIcons";
import { ClockInOutWithBreaks, formatToTimeString } from "./attendanceHelpers";
import {
  baseButtonClasses,
  criticalGradient,
  disabledClasses,
  primaryGradient,
} from "./attendanceStyles";

type TBreakButtonProps = {
  lastClockInOut: ClockInOutWithBreaks | null;
  lastBreak: ClockBreak | null;
  isOnBreak: boolean;
  isClockedIn: boolean;
  dayComplete: boolean;
  timezone: string;
};

export default function BreakButton({
  lastClockInOut,
  lastBreak,
  isOnBreak,
  isClockedIn,
  dayComplete,
  timezone,
}: TBreakButtonProps) {
  if (isOnBreak && lastBreak) {
    return (
      <button
        onClick={async () => {
          const res = await stopBreak({
            clockBreakId: lastBreak.id,
            timezone,
          });
          if (res.success) {
            successToast("Break Ended");
          }
        }}
        className={`${baseButtonClasses} ${criticalGradient} 2xl:text-xl`}
      >
        <div className="flex items-center justify-center gap-2">
          <ClockIcon className="h-5 w-5 animate-pulse" />
          <span>End Break</span>
        </div>
        <span className="mt-1 block text-xs font-light opacity-80">
          Break started{" "}
          {formatToTimeString(new Date(lastBreak.breakStart), timezone)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={async () => {
        if (!isClockedIn || !lastClockInOut || lastClockInOut.clockOut) return;

        const res = await takeBreak({
          clockInOutId: lastClockInOut.id,
          timezone,
        });
        if (res?.success) {
          successToast("Break Started");
        }
      }}
      className={`${baseButtonClasses} ${
        isClockedIn ? primaryGradient : disabledClasses
      } 2xl:text-xl`}
      disabled={!isClockedIn}
      title={
        dayComplete
          ? "Your shift is finished for today — breaks are available after your next clock-in"
          : !isClockedIn
            ? "Clock in first to start a break"
            : ""
      }
    >
      <span>Break</span>
      <div className="mt-1 flex flex-col">
        {isClockedIn && (
          <span className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]"></span>
        )}

        {!lastClockInOut?.clockOut &&
          lastClockInOut?.ClockBreak.slice(-3).map((breakItem, index) => (
            <span
              key={index}
              className="text-[10px] font-light leading-[1.3] opacity-80"
            >
              {formatToTimeString(breakItem.breakStart, timezone)} -{" "}
              {breakItem?.breakEnd &&
                formatToTimeString(breakItem.breakEnd, timezone)}
            </span>
          ))}
      </div>
    </button>
  );
}
