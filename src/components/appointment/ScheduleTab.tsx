import { formatTime } from "@/utils/taskAndActivity";
import { getHours } from "@/utils/time";
import { CalendarSettings } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import React from "react";

type TScheduleTabProps = {
  rows: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  settings?: CalendarSettings | null;
  onDateUpDown: (direction: "+" | "-") => void;
};

export default function ScheduleTab({
  rows,
  date,
  startTime,
  endTime,
  settings,
  onDateUpDown,
}: TScheduleTabProps) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-background px-8 py-2">
        <button type="button" onClick={() => onDateUpDown("-")}>
          <ChevronLeft />
        </button>
        <div className="mx-auto text-center">
          {moment(date).format("dddd, MMMM YYYY")}
        </div>
        <button type="button" onClick={() => onDateUpDown("+")}>
          <ChevronRight />
        </button>
      </div>
      {/* TODO:  */}
      <div className="relative divide-y">
        {rows.map((row, i) => {
          const rowTime = formatTime(row);
          let dateRangeForBgChanger = false;
          if (settings) {
            dateRangeForBgChanger =
              rowTime >= settings?.dayStart && rowTime <= settings?.dayEnd;
          }
          return (
            <div
              key={i}
              className="ml-16 flex h-16 items-start border-l border-solid"
              style={{
                backgroundColor: dateRangeForBgChanger ? "white" : "#F2F2F2",
              }}
            >
              {!!i && (
                <div className="-ml-2 w-full -translate-x-full -translate-y-1/2 text-end text-gray-600">
                  {row}
                </div>
              )}
            </div>
          );
        })}
        {startTime && endTime && (
          <div
            className="absolute left-16 right-0 rounded border border-solid border-indigo-500 bg-indigo-500/30"
            style={{
              top: `${getHours(startTime) * 4}rem`,
              bottom: `${(24 - getHours(endTime)) * 4}rem`,
            }}
          />
        )}
      </div>
    </>
  );
}
