"use client";
import { cn } from "@/lib/cn";
import { format, isValid, parse } from "date-fns";
import { Calendar } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
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
    searchParams.delete("page");
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
    searchParams.delete("page");
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);

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
    <div className="relative w-full lg:w-fit">
      <button
        ref={buttonRef}
        onClick={togglePicker}
        className={cn(
          "w-full flex items-center justify-center gap-x-2 text-base lg:gap-x-2",
          "rounded-xl px-3 py-2 transition-transform duration-500 ease-out transform hover:scale-[1.02]",
          "bg-white dark:bg-slate-900",
          "ring-1 ring-slate-900/5 dark:ring-slate-700/20 hover:ring-[#6470fd]/50 hover:shadow-sm",
          activeModal[modalName]
            ? "ring-2 ring-[#6470fd] shadow-[0_20px_40px_-12px_rgba(100,112,253,0.10)]"
            : "",
          "md:w-44",
          activeModal[modalName] ? "rounded-md" : "rounded-xl",
          isRangeSelected ? "border-2 border-[#6470fd]" : "border",
        )}
      >
        <span
          className={cn(
            "truncate max-w-[10rem]",
            isRangeSelected
              ? "text-slate-600 dark:text-slate-200"
              : "text-slate-400",
          )}
        >
          {formatRange(state.selection.startDate, state.selection.endDate)}
        </span>
        <Calendar
          className={cn(
            "w-4 h-4 text-slate-500 dark:text-slate-300",
            activeModal[modalName] ? "text-[#6470fd]" : "",
          )}
        />
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
