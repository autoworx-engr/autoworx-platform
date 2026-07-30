"use client";

import { ClockBreak, ClockInOut } from "@prisma/client";
import { stopBreak, takeBreak } from "@/actions/dashboard/break";
import { clockIn } from "@/actions/dashboard/clockIn";
import { clockOut } from "@/actions/dashboard/clockOut";
import { successToast } from "@/lib/toast";
import moment from "moment-timezone";
import { useCallback } from "react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

// Placeholder for an Icon (e.g., Lucide or Heroicons)
const ClockIcon = (props: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

type TAttendanceButtonsBoxProps = {
  lastClockInOut: (ClockInOut & { ClockBreak: ClockBreak[] }) | null;
};

export function formatDateToCustomString(date: Date, timezone?: string) {
  const companyTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return moment(date).tz(companyTimezone).format("MMMM D, YYYY h:mm A");
}

export function formatToTimeString(date: Date, timezone?: string) {
  const companyTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return moment(date).tz(companyTimezone).format("h:mm A");
}

// -------------------------------------------------------------
// Core Component Starts Here
// -------------------------------------------------------------

export default function AttendanceButtonsBox({
  lastClockInOut,
}: TAttendanceButtonsBoxProps) {
  const companyTimezone = useCompanyTimezone();

  const hasClockedInToday = lastClockInOut?.clockIn
    ? moment
        .utc(lastClockInOut.clockIn)
        .tz(companyTimezone)
        .isSame(moment().tz(companyTimezone), "day")
    : false;

  const hasClockedOutToday = lastClockInOut?.clockOut
    ? moment
        .utc(lastClockInOut.clockOut)
        .tz(companyTimezone)
        .isSame(moment().tz(companyTimezone), "day")
    : false;

  const validBreak = useCallback(
    function (lastClockInOut: ClockInOut & { ClockBreak: ClockBreak[] }) {
      return (
        lastClockInOut &&
        lastClockInOut.ClockBreak?.length > 0 &&
        lastClockInOut.ClockBreak[lastClockInOut.ClockBreak.length - 1] &&
        lastClockInOut?.ClockBreak[lastClockInOut?.ClockBreak?.length - 1].id
      );
    },
    [lastClockInOut],
  );

  // Check if technician is currently on break
  const isOnBreak =
    lastClockInOut &&
    lastClockInOut?.ClockBreak.length > 0 &&
    lastClockInOut?.ClockBreak[lastClockInOut?.ClockBreak?.length - 1]
      ?.breakEnd === null;

  // Check if technician is clocked in (and not clocked out)
  const isClockedIn =
    lastClockInOut && lastClockInOut?.clockIn && !lastClockInOut?.clockOut;

  // ----------------------------------------------------------------------
  // Tailwind Utility Classes for Consistency and Professional Look
  // ----------------------------------------------------------------------

  // Base button classes for common styling
  const baseButtonClasses =
    "h-full w-full rounded-xl px-4 py-4 font-semibold text-white transition-all duration-300 xl:px-10 group relative overflow-hidden";

  // Disabled button classes
  const disabledClasses =
    "cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-inner ring-1 ring-slate-400/20 dark:ring-slate-600/20";

  // Primary action gradient (Blue)
  const primaryGradient =
    "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5";

  // Active/Success state gradient (Emerald/Teal)
  const successGradient =
    "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40";

  // Critical/Break End state (Rose/Red)
  const criticalGradient =
    "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5";

  // ----------------------------------------------------------------------

  return (
    <div
      className={`
        flex flex-col sm:flex-row w-full gap-3 p-4
        rounded-2xl shadow-2xl dark:shadow-slate-900/50
        bg-white/70 dark:bg-slate-800/70
        ring-1 ring-slate-900/5 dark:ring-slate-700/50
        backdrop-blur-md
      `}
    >
      {/* Clock-In Button */}
      <div className="w-full">
        <button
          onClick={async () => {
            console.log("Clock-In Button Clicked");
            if (!lastClockInOut || lastClockInOut?.clockOut) {
              console.log("Attempting to Clock In...");
              const res = await clockIn({
                timezone: companyTimezone,
              });
              console.log("Clock-In Response:", res);
              if (res.success) {
                successToast("Clocked In Successfully");
              }
            }
          }}
          className={`${baseButtonClasses} ${
            !lastClockInOut || lastClockInOut?.clockOut // Ready for Clock-In
              ? primaryGradient
              : isClockedIn // Currently Clocked-In (Active/Success)
                ? successGradient
                : disabledClasses // Disabled/Other edge cases
          } ${
            hasClockedInToday && !isClockedIn ? disabledClasses : ""
          } 2xl:text-xl`}
          disabled={hasClockedInToday && !isClockedIn} // Disable if already clocked in AND clocked out
          title={
            hasClockedInToday && !isClockedIn
              ? "You have already clocked in and out today"
              : ""
          }
        >
          {isClockedIn ? (
            // Active Clock-In State
            <>
              <div className="flex items-center justify-center gap-2">
                <ClockIcon className="w-5 h-5 animate-pulse" />
                <span>Clocked-In</span>
              </div>
              <span className="text-xs font-light mt-1 block opacity-80">
                {formatDateToCustomString(
                  new Date(lastClockInOut!.clockIn!),
                  companyTimezone,
                )}
              </span>
            </>
          ) : (
            // Ready-to-Clock-In State
            "Clock-In"
          )}
        </button>
      </div>

      {/* Clock-Out Button */}
      <div className="w-full">
        <button
          onClick={async () => {
            // Prevent clock out if on break or not clocked in
            if (isOnBreak || !isClockedIn) {
              return;
            }

            if (lastClockInOut && !lastClockInOut?.clockOut) {
              const res = await clockOut({
                clockInOutId: lastClockInOut.id,
              });
              if (res.success) {
                successToast("Clocked Out Successfully");
              }
            }
          }}
          className={`${baseButtonClasses} ${
            hasClockedOutToday || isOnBreak || !isClockedIn
              ? disabledClasses
              : primaryGradient
          } 2xl:text-xl`}
          disabled={hasClockedOutToday || isOnBreak || !isClockedIn}
          title={
            hasClockedOutToday
              ? "You have already clocked out today"
              : isOnBreak
                ? "You must end your break before clocking out"
                : !isClockedIn
                  ? "You must clock in before you can clock out"
                  : ""
          }
        >
          Clock-Out
        </button>
      </div>

      {/* Break / End Break Button */}
      <div className="w-full">
        {isOnBreak ? (
          // End Break (Critical Action)
          <button
            onClick={async () => {
              if (lastClockInOut && validBreak(lastClockInOut)) {
                const res = await stopBreak({
                  clockBreakId:
                    lastClockInOut.ClockBreak[
                      lastClockInOut.ClockBreak.length - 1
                    ].id,
                });
                if (res.success) {
                  successToast("Break Ended");
                }
              }
            }}
            className={`${baseButtonClasses} ${criticalGradient} 2xl:text-xl`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="w-5 h-5 animate-pulse" />
              <span>End Break</span>
            </div>
            <span className="text-xs font-light mt-1 block opacity-80">
              {/* Display break start time */}
              Break started{" "}
              {formatToTimeString(
                new Date(
                  lastClockInOut!.ClockBreak[
                    lastClockInOut!.ClockBreak.length - 1
                  ].breakStart,
                ),
                companyTimezone,
              )}
            </span>
          </button>
        ) : (
          // Take Break (Secondary Action, only if clocked in)
          <button
            onClick={async () => {
              // Only allow break if clocked in
              if (!isClockedIn) {
                return;
              }

              if (lastClockInOut && !lastClockInOut?.clockOut) {
                const res = await takeBreak({
                  clockInOutId: lastClockInOut.id,
                });
                if (res?.success) {
                  successToast("Break Started");
                }
              }
            }}
            className={`${baseButtonClasses} ${
              isClockedIn ? primaryGradient : disabledClasses
            } 2xl:text-xl`}
            disabled={!isClockedIn}
            title={
              !isClockedIn ? "You must clock in before taking a break" : ""
            }
          >
            <span>Break</span>
            <div className="mt-1 flex flex-col">
              {/* Added a subtle shine effect on hover for active buttons */}
              {isClockedIn && (
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300"></span>
              )}

              {/* Display recent break history */}
              {!lastClockInOut?.clockOut &&
                lastClockInOut?.ClockBreak.slice(-3).map((Break, ind) => {
                  return (
                    <span
                      key={ind}
                      className="text-[10px] font-light leading-[1.3] opacity-80"
                    >
                      {formatToTimeString(Break.breakStart, companyTimezone)} -{" "}
                      {Break?.breakEnd &&
                        formatToTimeString(Break?.breakEnd, companyTimezone)}
                    </span>
                  );
                })}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
