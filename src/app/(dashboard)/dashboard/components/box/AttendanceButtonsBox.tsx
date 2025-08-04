"use client";

import { ClockBreak, ClockInOut } from "@prisma/client";

import { stopBreak, takeBreak } from "@/actions/dashboard/break";
import { clockIn } from "@/actions/dashboard/clockIn";
import { clockOut } from "@/actions/dashboard/clockOut";
// import { useAutoRefreshRoute } from "@/hooks/useAutoRefreshRoute.ts";
import { successToast } from "@/lib/toast";
import moment from "moment-timezone";
import { useCallback } from "react";

type TAttendanceButtonsBoxProps = {
  lastClockInOut: (ClockInOut & { ClockBreak: ClockBreak[] }) | null;
};

export function formatDateToCustomString(date: Date) {
  const options = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  //@ts-ignore
  return moment(date).utc().toDate().toLocaleString("en-US", options);
}

export function formatToTimeString(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const amPm = hours >= 12 ? "PM" : "AM";

  // Convert 24-hour format to 12-hour format
  hours = hours % 12 || 12;

  // Format minutes with leading zero if needed
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours.toString().padStart(2, "0")}:${formattedMinutes} ${amPm}`;
}

export default function AttendanceButtonsBox({
  lastClockInOut,
}: TAttendanceButtonsBoxProps) {
  const hasClockedInToday = lastClockInOut?.clockIn
    ? moment
        .utc(lastClockInOut.clockIn)
        .tz(lastClockInOut.timezone ?? moment.tz.guess())
        .isSame(
          moment().tz(lastClockInOut.timezone ?? moment.tz.guess()),
          "day",
        )
    : false;

  const hasClockedOutToday = lastClockInOut?.clockOut
    ? moment
        .utc(lastClockInOut.clockOut)
        .tz(lastClockInOut.timezone ?? moment.tz.guess())
        .isSame(
          moment().tz(lastClockInOut.timezone ?? moment.tz.guess()),
          "day",
        )
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
  return (
    <div className="flex h-[20%] justify-between gap-x-2 rounded-md p-4 shadow-lg xl:p-8">
      <div>
        <button
          onClick={async () => {
            if (!lastClockInOut || lastClockInOut?.clockOut) {
              const res = await clockIn({
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              });
              if (res.success) {
                successToast("Clocked In Successfully");
              }
            }
          }}
          className={`h-full rounded ${
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
              {formatDateToCustomString(new Date(lastClockInOut?.clockIn))}
            </span>
          )}
        </button>
      </div>
      <div>
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
          className={`h-full rounded ${
            hasClockedOutToday
              ? "cursor-not-allowed bg-gray-400"
              : "bg-[#6571FF]"
          } bg-[#6571FF] px-4 py-4 text-xl font-semibold text-white xl:px-10 ${lastClockInOut && lastClockInOut?.clockIn && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
          disabled={hasClockedOutToday ?? false}
          title={hasClockedOutToday ? "You have already clocked out today" : ""}
        >
          <span className="font-semibold xl:text-xl">Clock-Out</span>
          <br />
          {/* <span className="text-xs">10:00 AM</span> */}
        </button>
      </div>
      <div>
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
            className={`h-full rounded bg-[#03A7A2] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl`}
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
            className={`h-full rounded bg-[#6571FF] px-4 py-4 font-semibold text-white xl:px-10 xl:text-xl ${lastClockInOut && !lastClockInOut?.clockOut ? "cursor-pointer" : "cursor-default"}`}
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
                      {formatToTimeString(Break.breakStart)} -{" "}
                      {Break?.breakEnd && formatToTimeString(Break?.breakEnd)}
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
