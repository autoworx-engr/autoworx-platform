"use client";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file

const DateRange = ({
  onOk,
  onCancel,
}: {
  onOk: (start: Date, end: Date) => void;
  onCancel: () => void;
}) => {
  const [state, setState] = useState({
    selection: {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState(state.selection);
  const [isRangeSelected, setIsRangeSelected] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
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
    setState({ selection: tempRange });
    setShowPicker(false);
    setIsRangeSelected(true);
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
    setIsRangeSelected(false);
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
    <div className="relative w-full md:w-auto" ref={ref}>
      <button
        ref={buttonRef}
        onClick={togglePicker}
        className="flex w-[150px] items-center gap-2 rounded-lg border border-gray-400 p-2 text-gray-400 hover:border-blue-600 md:w-full md:text-sm"
      >
        <span className="truncate">
          {isRangeSelected
            ? formatRange(state.selection.startDate, state.selection.endDate)
            : "Date Range"}
        </span>
        <Calendar size={16} className="ml-3 text-lg md:ml-0 md:text-base" />
      </button>

      {showPicker && (
        <div className="absolute left-48 right-auto top-72 z-50 mt-2 w-[338px] -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto rounded-lg border border-gray-300 bg-background p-4 shadow-lg md:left-auto md:right-auto md:top-full md:w-[600px] md:translate-x-0 md:translate-y-0 md:transform-none">
          <DateRangePicker
            ranges={[tempRange]}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            preventSnapRefocus={true}
            calendarFocus="forwards"
            className={`[&_.rdrDayStartPreview]:!color-transparent [&_.rdrDayEndPreview]:!color-transparent [&_.rdrDateDisplayItem]:p-2 [&_.rdrDateDisplayItem_input]:text-sm [&_.rdrDateDisplayWrapper]:!w-[300px] [&_.rdrDateDisplay]:text-sm [&_.rdrDayEndPreview]:!border-0 [&_.rdrDayHovered]:!border-0 [&_.rdrDayHovered]:!bg-transparent [&_.rdrDayInPreview]:!border-0 [&_.rdrDayInPreview]:!bg-transparent [&_.rdrDayNumber]:text-sm [&_.rdrDayStartPreview]:!border-0 [&_.rdrDayToday]:!bg-[#6571FF] [&_.rdrDayToday]:after:hidden [&_.rdrDayToday_.rdrDayNumber]:!text-white [&_.rdrDay]:!bg-transparent [&_.rdrDay_today]:!border-0 [&_.rdrDay_today]:!bg-transparent [&_.rdrDefinedRangesWrapper]:hidden md:[&_.rdrDefinedRangesWrapper]:block [&_.rdrMonthAndYearWrapper]:!w-[300px] [&_.rdrMonthName]:text-sm [&_.rdrMonthPicker]:text-sm [&_.rdrMonth]:!w-[300px] [&_.rdrMonths]:!w-[300px] [&_.rdrNextPrevButton]:h-8 [&_.rdrNextPrevButton]:w-8 [&_.rdrWeekDay]:text-xs [&_.rdrYearPicker]:text-sm`}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="min-w-[60px] rounded bg-red-500 px-3 py-2 text-sm text-white md:px-4 md:text-base"
            >
              Clear
            </button>
            <button
              onClick={handleOk}
              className="min-w-[60px] rounded bg-blue-500 px-3 py-2 text-sm text-white md:px-4 md:text-base"
            >
              OK
            </button>
            <button
              onClick={togglePicker}
              className="min-w-[60px] rounded bg-gray-300 px-3 py-2 text-sm md:px-4 md:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRange;
