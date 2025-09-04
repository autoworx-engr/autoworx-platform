"use client";

import { ClockBreak, ClockInOut } from "@prisma/client";

import { stopBreak, takeBreak } from "@/actions/dashboard/break";
import { clockIn } from "@/actions/dashboard/clockIn";
import { clockOut } from "@/actions/dashboard/clockOut";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";
import { successToast } from "@/lib/toast";
import moment from "moment-timezone";
import { useCallback } from "react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

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
    [lastClockInOut]
  );
  return (
    <div className="flex flex-col sm:flex-row w-full h-[13%] gap-2 rounded-md p-4 shadow-lg">
      <div className="w-full">
        <button
          onClick={async () => {
            if (!lastClockInOut || lastClockInOut?.clockOut) {
              const res = await clockIn({
                timezone: companyTimezone,
              });
              if (res.success) {
                successToast("Clocked In Successfully");
              }
            }
          }}
          className={`h-full w-full rounded ${
            hasClockedInToday
              ? "cursor-not-allowed bg-gray-400"
              : !lastClockInOut?.clockOut && lastClockInOut?.clockIn
                ? "bg-[#03A7A2]"
                : "bg-[#6571FF]"
          } ${!lastClockInOut?.clockOut && lastClockInOut?.clockIn ? "bg-[#03A7A2]" : "bg-[#6571FF]"} ${!lastClockInOut || lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"} px-4 py-4 text-white xl:px-10`}
          disabled={hasClockedInToday}
          title={hasClockedInToday ? "You have already clocked in today" : ""}
        >
          <span className="font-semibold xl:text-xl">
            {!lastClockInOut?.clockOut && lastClockInOut?.clockIn
              ? "Clocked-In"
              : "Clock-In"}
          </span>
          <br />
          {lastClockInOut?.clockIn && !lastClockInOut?.clockOut && (
            <span className="text-xs">
              {formatDateToCustomString(
                new Date(lastClockInOut?.clockIn),
                companyTimezone
              )}
            </span>
          )}
        </button>
      </div>
      <div className="w-full">
        <button
          onClick={async () => {
            if (lastClockInOut && !lastClockInOut?.clockOut) {
              const res = await clockOut({
                clockInOutId: lastClockInOut.id,
              });
              if (res.success) {
                successToast("Clocked Out Successfully");
              }
            }
          }}
          className={`h-full w-full rounded ${
            hasClockedOutToday
              ? "cursor-not-allowed bg-gray-400"
              : "bg-[#6571FF]"
          } bg-[#6571FF] px-4 py-4 font-semibold text-white xl:px-10 ${lastClockInOut && lastClockInOut?.clockIn && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
          disabled={hasClockedOutToday ?? false}
          title={hasClockedOutToday ? "You have already clocked out today" : ""}
        >
          <span className="font-semibold xl:text-xl">Clock-Out</span>
          <br />
          {/* <span className="text-xs">10:00 AM</span> */}
        </button>
      </div>
      <div className="w-full">
        {lastClockInOut &&
        lastClockInOut?.ClockBreak[lastClockInOut?.ClockBreak?.length - 1]
          ?.breakEnd === null ? (
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
            className={`h-full w-full rounded bg-[#03A7A2] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl`}
          >
            End Break
          </button>
        ) : (
          <button
            onClick={async () => {
              if (lastClockInOut && !lastClockInOut?.clockOut) {
                const res = await takeBreak({
                  clockInOutId: lastClockInOut.id,
                });
                if (res?.success) {
                  successToast("Break Started");
                }
              }
            }}
            className={`h-full w-full rounded bg-[#6571FF] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl ${lastClockInOut && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
          >
            <span>Break</span> <br />
            <div className="mt-1 flex flex-col">
              {!lastClockInOut?.clockOut &&
                lastClockInOut?.ClockBreak.slice(-3).map((Break, ind) => {
                  return (
                    <span
                      key={ind}
                      className="text-[10px] font-light leading-[1.3]"
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
