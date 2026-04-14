"use client";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file

const DateRange = ({
  onOk,
  onCancel,
  dateRange: dateRangeProp,
}: {
  onOk: (start: Date, end: Date) => void;
  onCancel: () => void;
  dateRange?: [Date | null, Date | null];
}) => {
  const pipelineStore = usePipelineFilterStore();
  const currentRange = dateRangeProp || pipelineStore.dateRange;
  const isRangeSelected = currentRange[0] !== null && currentRange[1] !== null;

  const [state, setState] = useState({
    selection: {
      startDate: currentRange[0] || new Date(),
      endDate: currentRange[1] || new Date(),
      key: "selection",
    },
  });
  const ref = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState(state.selection);

  useEffect(() => {
    if (isRangeSelected) {
      const newSelection = {
        startDate: currentRange[0]!,
        endDate: currentRange[1]!,
        key: "selection",
      };
      setState({ selection: newSelection });
      setTempRange(newSelection);
    } else {
      const resetSelection = {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      };
      setState({ selection: resetSelection });
      setTempRange(resetSelection);
    }
  }, [currentRange[0], currentRange[1], isRangeSelected]);

  const handleClickOutside = (event: any) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setShowPicker(false);
    }
  };
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (ranges: any) => {
    const { startDate, endDate, key } = ranges.selection;
    // moveRangeOnFirstSelection=false keeps the previous endDate when user picks a
    if (startDate > endDate) {
      setTempRange({ startDate, endDate: startDate, key });
    } else {
      setTempRange(ranges.selection);
    }
  };

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    if (!isRangeSelected) {
      setTempRange({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      });
    }
  }, [isRangeSelected]);
  const handleOk = () => {
    setState({ selection: tempRange });
    setShowPicker(false);
    onOk(tempRange.startDate, tempRange.endDate);
  };

  const handleCancel = () => {
    togglePicker();
    // reset everything
    setState({
      selection: {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      },
    });
    setTempRange({
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    });
    onCancel();
  };

  const formatRange = (start: Date, end: Date) => {
    const formattedStart = format(start, "MM/dd/yyyy");
    const formattedEnd = format(end, "MM/dd/yyyy");
    return `${formattedStart} - ${formattedEnd}`;
  };

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={togglePicker}
        className={`
            flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ease-out
            ${
              showPicker
                ? "bg-white ring-2 ring-[#6571FF] shadow-md shadow-indigo-500/10 dark:bg-slate-900"
                : "bg-white ring-1 ring-slate-200 hover:ring-indigo-500/50 hover:shadow-sm dark:bg-slate-900 dark:ring-slate-700"
            }
        `}
      >
        <span
          className={`font-medium ${isRangeSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
        >
          {isRangeSelected
            ? formatRange(state.selection.startDate, state.selection.endDate)
            : "Select Date Range"}
        </span>
        <Calendar
          className={`w-4 h-4 ${showPicker || isRangeSelected ? "text-[#6571FF]" : "text-slate-400"}`}
        />
      </button>

      {showPicker && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[330px] lg:w-[560px] rounded-2xl border border-slate-100 bg-white p-3 lg:p-5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 dark:bg-slate-900 dark:border-slate-800 dark:ring-white/10">
          <DateRangePicker
            inputRanges={[]}
            ranges={[tempRange]}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            preventSnapRefocus={true}
            calendarFocus="forwards"
            className={`[&_.rdrDayStartPreview]:!color-transparent [&_.rdrDayEndPreview]:!color-transparent [&_.rdrDateDisplayItem]:p-2 [&_.rdrDateDisplayItem_input]:text-sm [&_.rdrDateDisplayWrapper]:!w-[300px] [&_.rdrDateDisplay]:text-sm [&_.rdrDayEndPreview]:!border-0 [&_.rdrDayHovered]:!border-0 [&_.rdrDayHovered]:!bg-transparent [&_.rdrDayInPreview]:!border-0 [&_.rdrDayInPreview]:!bg-transparent [&_.rdrDayNumber]:text-sm [&_.rdrDayStartPreview]:!border-0 [&_.rdrDayToday]:!bg-[#6571FF] [&_.rdrDayToday]:after:hidden [&_.rdrDayToday_.rdrDayNumber]:!text-white [&_.rdrDay]:!bg-transparent [&_.rdrDay_today]:!border-0 [&_.rdrDay_today]:!bg-transparent [&_.rdrDefinedRangesWrapper]:hidden lg:[&_.rdrDefinedRangesWrapper]:block [&_.rdrMonthAndYearWrapper]:!w-[300px] [&_.rdrMonthName]:text-sm [&_.rdrMonthPicker]:text-sm [&_.rdrMonth]:!w-[300px] [&_.rdrMonths]:!w-[300px] [&_.rdrNextPrevButton]:h-8 [&_.rdrNextPrevButton]:w-8 [&_.rdrWeekDay]:text-xs [&_.rdrYearPicker]:text-sm`}
          />
          <div className="mt-2 w-full flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={handleCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400"
            >
              Clear
            </button>
            <button
              onClick={handleOk}
              className="rounded-lg bg-gradient-to-r from-[#6571FF] to-[#5a66ee] px-6 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRange;
