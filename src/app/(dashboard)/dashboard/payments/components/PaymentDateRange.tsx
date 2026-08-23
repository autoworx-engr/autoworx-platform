"use client";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file

const PaymentDateRange = ({
  onOk,
  onCancel,
  dateRange: dateRangeProp,
}: {
  onOk: (start: Date, end: Date) => void;
  onCancel: () => void;
  dateRange?: [Date | null, Date | null];
}) => {
  const selectedStart = dateRangeProp?.[0] ?? null;
  const selectedEnd = dateRangeProp?.[1] ?? null;

  const getSelectionFromProps = useCallback(
    () => ({
      startDate: selectedStart || new Date(),
      endDate: selectedEnd || new Date(),
      key: "selection",
    }),
    [selectedStart, selectedEnd],
  );

  const [state, setState] = useState({
    selection: getSelectionFromProps(),
  });
  const ref = useRef<HTMLDivElement>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState(getSelectionFromProps());
  const isRangeSelected =
    selectedStart !== undefined &&
    selectedStart !== null &&
    selectedEnd !== undefined &&
    selectedEnd !== null;

  useEffect(() => {
    const syncedSelection = getSelectionFromProps();
    setState({ selection: syncedSelection });
    setTempRange(syncedSelection);
  }, [selectedStart, selectedEnd, getSelectionFromProps]);

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
    setTempRange(ranges.selection);
  };

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  const handleOk = () => {
    if (!tempRange.startDate || !tempRange.endDate) {
      return;
    }

    setState({ selection: tempRange });
    setShowPicker(false);
    onOk(tempRange.startDate, tempRange.endDate);
  };

  const handleClear = () => {
    const resetSelection = {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    };
    setState({ selection: resetSelection });
    setTempRange(resetSelection);
    setShowPicker(false);
    onCancel();
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempRange(state.selection);
  };

  const formatRange = (start: Date, end: Date) => {
    const formattedStart = format(start, "MM/dd/yyyy");
    const formattedEnd = format(end, "MM/dd/yyyy");
    return `${formattedStart} - ${formattedEnd}`;
  };

  // z-30 clears the table's sticky z-10 header but stays under app overlays
  // (the incoming-call alert is z-50).
  return (
    <div ref={ref} className="relative z-30">
      <button
        onClick={togglePicker}
        className={`
            flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ease-out
            ${
              showPicker
                ? "bg-white ring-2 ring-primary shadow-md shadow-indigo-500/10 dark:bg-slate-900"
                : "bg-white ring-1 ring-slate-200 hover:ring-indigo-500/50 hover:shadow-sm dark:bg-slate-900 dark:ring-slate-700"
            }
        `}
      >
        <span
          className={`font-medium truncate ${isRangeSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
        >
          {isRangeSelected
            ? formatRange(state.selection.startDate, state.selection.endDate)
            : "Select Date Range"}
        </span>
        <Calendar
          className={`w-4 h-4 ${showPicker || isRangeSelected ? "text-primary" : "text-slate-400"}`}
        />
      </button>

      {showPicker && (
        <div className="absolute left-0 top-full z-10 mt-2 max-h-[75vh] w-[338px] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10 lg:w-[600px]">
          <DateRangePicker
            inputRanges={[]}
            ranges={[tempRange]}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            preventSnapRefocus={true}
            calendarFocus="forwards"
            className={`!w-full [&_.rdrDayStartPreview]:!color-transparent [&_.rdrDayEndPreview]:!color-transparent [&_.rdrCalendarWrapper]:!w-full [&_.rdrDateDisplayItem]:p-2 [&_.rdrDateDisplayItem_input]:text-sm [&_.rdrDateDisplayWrapper]:!w-full [&_.rdrDateDisplay]:text-sm [&_.rdrDayEndPreview]:!border-0 [&_.rdrDayHovered]:!border-0 [&_.rdrDayHovered]:!bg-transparent [&_.rdrDayInPreview]:!border-0 [&_.rdrDayInPreview]:!bg-transparent [&_.rdrDayNumber]:text-sm [&_.rdrDayStartPreview]:!border-0 [&_.rdrDayToday]:!bg-primary [&_.rdrDayToday]:after:hidden [&_.rdrDayToday_.rdrDayNumber]:!text-white [&_.rdrDay]:!bg-transparent [&_.rdrDay_today]:!border-0 [&_.rdrDay_today]:!bg-transparent [&_.rdrDefinedRangesWrapper]:hidden md:[&_.rdrDefinedRangesWrapper]:block [&_.rdrMonthAndYearWrapper]:!w-full [&_.rdrMonthName]:text-sm [&_.rdrMonthPicker]:text-sm [&_.rdrMonth]:!w-full [&_.rdrMonth]:!px-0 [&_.rdrMonths]:!w-full [&_.rdrNextPrevButton]:h-8 [&_.rdrNextPrevButton]:w-8 [&_.rdrWeekDay]:text-xs [&_.rdrYearPicker]:text-sm`}
          />
          <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={handleClear}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400"
            >
              Clear
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleOk}
              className="rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDateRange;
