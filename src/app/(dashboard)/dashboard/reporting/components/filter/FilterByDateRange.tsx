"use client";
import { format, isValid, parse } from "date-fns";
import { Calendar } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
type TProps = {
  startDate?: string;
  endDate?: string;
  modalName: string;
  closeModal: (modalName: string) => void;
  toggleModal: (modalName: string) => void;
  activeModal: Record<string, boolean>;
  queryDateFormat?: string;
};
export default function FilterDateRange({
  startDate,
  endDate,
  closeModal,
  toggleModal,
  activeModal,
  modalName,
  queryDateFormat = "MM/dd/yyyy",
}: TProps) {
  const parseFromQuery = (value?: string) => {
    if (!value || value === "undefined") return null;
    const parsed = parse(value, queryDateFormat, new Date());
    return isValid(parsed) ? parsed : null;
  };

  const parsedStart = parseFromQuery(startDate);
  const parsedEnd = parseFromQuery(endDate);
  const initialStartDate = parsedStart || new Date();
  const initialEndDate = parsedEnd || new Date();

  const [state, setState] = useState({
    selection: {
      startDate: initialStartDate,
      endDate: initialEndDate,
      key: "selection",
    },
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState(state.selection);
  const [isRangeSelected, setIsRangeSelected] = useState(
    Boolean(parsedStart && parsedEnd),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeModal(modalName);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeModal, modalName]);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const handleSelect = (ranges: any) => {
    setTempRange(ranges.selection);
  };

  const togglePicker = () => {
    toggleModal(modalName);
  };

  const handleOk = () => {
    const searchParams = new URLSearchParams(params!);
    const formattedStart = format(tempRange.startDate, queryDateFormat);
    const formattedEnd = format(tempRange.endDate, queryDateFormat);
    if (tempRange.startDate && tempRange.endDate) {
      searchParams.set("startDate", formattedStart);
      searchParams.set("endDate", formattedEnd);
    } else {
      searchParams.delete("startDate");
      searchParams.delete("endDate");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
    setState({ selection: tempRange });
    closeModal(modalName);
    setIsRangeSelected(true);
  };

  const formatRange = (start: Date, end: Date) => {
    if (!isRangeSelected) {
      return "Select Date Range";
    }
    return `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}`;
  };

  const handleClear = () => {
    const searchParams = new URLSearchParams(params!);
    searchParams.delete("startDate");
    searchParams.delete("endDate");
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);

    // Reset both state and temporary range
    const resetSelection = {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    };

    setState({ selection: resetSelection });
    setTempRange(resetSelection);
    setIsRangeSelected(false);
  };
  return (
    <div className="relative w-full md:w-auto">
      <button
        ref={buttonRef}
        onClick={togglePicker}
        className={`
          flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ease-out
          ${
            activeModal[modalName]
              ? "bg-white ring-2 ring-primary shadow-md shadow-indigo-500/10 dark:bg-slate-900"
              : "bg-white ring-1 ring-slate-200 hover:ring-indigo-500/50 hover:shadow-sm dark:bg-slate-900 dark:ring-slate-700"
          }
        `}
      >
        <span
          className={`font-medium truncate ${isRangeSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
        >
          {formatRange(state.selection.startDate, state.selection.endDate)}
        </span>
        <Calendar className={`w-4 h-4`} />
      </button>

      {activeModal[modalName] && (
        <div
          ref={dropdownRef}
          className="fixed left-1/2 right-auto top-[38%] z-50 mt-2 w-[338px] -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto rounded-lg border border-gray-300 bg-background p-4 shadow-lg md:absolute md:left-auto md:right-auto md:top-full md:w-auto md:translate-x-0 md:translate-y-0 md:transform-none"
        >
          <div className="relative">
            <DateRangePicker
              ranges={[tempRange]}
              onChange={handleSelect}
              moveRangeOnFirstSelection={false}
              months={1}
              direction="horizontal"
              preventSnapRefocus={true}
              calendarFocus="forwards"
              className={`[&_.rdrDayStartPreview]:!color-transparent [&_.rdrDayEndPreview]:!color-transparent [&_.rdrDateDisplayItem]:p-2 [&_.rdrDateDisplayItem_input]:text-sm [&_.rdrDateDisplayWrapper]:!w-[300px] [&_.rdrDateDisplay]:text-sm [&_.rdrDayEndPreview]:!border-0 [&_.rdrDayHovered]:!border-0 [&_.rdrDayHovered]:!bg-transparent [&_.rdrDayInPreview]:!border-0 [&_.rdrDayInPreview]:!bg-transparent [&_.rdrDayNumber]:text-sm [&_.rdrDayStartPreview]:!border-0 [&_.rdrDayToday]:!bg-primary [&_.rdrDayToday]:after:hidden [&_.rdrDayToday_.rdrDayNumber]:!text-white [&_.rdrDay]:!bg-transparent [&_.rdrDay_today]:!border-0 [&_.rdrDay_today]:!bg-transparent [&_.rdrDefinedRangesWrapper]:hidden md:[&_.rdrDefinedRangesWrapper]:block [&_.rdrMonthAndYearWrapper]:!w-[300px] [&_.rdrMonthName]:text-sm [&_.rdrMonthPicker]:text-sm [&_.rdrMonth]:!w-[300px] [&_.rdrMonths]:!w-[300px] [&_.rdrNextPrevButton]:h-8 [&_.rdrNextPrevButton]:w-8 [&_.rdrWeekDay]:text-xs [&_.rdrYearPicker]:text-sm`}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleClear}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 border"
            >
              Clear
            </button>
            <button
              onClick={togglePicker}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 border"
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
}
