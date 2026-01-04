import { cn } from "@/lib/cn";
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

  const formatTo12Hour = (time: string) => {
    if (!time) return "";
    return moment(time, "HH:mm").format("h:mm A");
  };
  return (
    <>
      {/* Modern Sticky Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/80 px-8 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onDateUpDown("-")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-[#6571FF]"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            {moment(date).format("dddd")}
          </h2>
          <p className="text-lg font-extrabold text-slate-500">
            {moment(date).format("MMMM D, YYYY")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDateUpDown("+")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-[#6571FF]"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Timeline Grid */}
      <div className="relative overflow-hidden bg-white">
        {rows.map((row, i) => {
          const rowTime = formatTime(row);
          let isBusinessHours = false;
          if (settings) {
            isBusinessHours = rowTime >= settings?.dayStart && rowTime <= settings?.dayEnd;
          }

          return (
            <div
              key={i}
              className={cn(
                "ml-20 flex h-16 items-start border-l border-t border-slate-100 transition-colors",
                !isBusinessHours ? "bg-slate-50/50" : "bg-white"
              )}
            >
              {/* Timestamp Labels */}
              <div className="absolute left-0 -mt-2.5 w-16 pr-4 text-right text-sm font-bold uppercase tracking-tighter text-slate-500">
                {row}
              </div>
            </div>
          );
        })}

        {/* Selected Time Block (The Event) */}
        {startTime && endTime && (
          <div
            className="absolute left-20 right-4 rounded-lg border-l-2 border-solid border-[#6571FF] bg-[#6571FF]/10 shadow-[inset_0_0_0_1px_rgba(101,113,255,0.2)] transition-all duration-500 animate-in fade-in zoom-in-95"
            style={{
              top: `${getHours(startTime) * 4}rem`,
              bottom: `${(24 - getHours(endTime)) * 4}rem`,
              marginTop: '1px' // Adjustment for border-top alignment
            }}
          >
            <div className="p-3">
              <p className="text-sm font-semibold text-[#6571FF]">Selected Slot</p>
              <p className="text-sm font-medium text-[#6571FF]/80">
                {formatTo12Hour(startTime)} — {formatTo12Hour(endTime)}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
