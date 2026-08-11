"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getWeekInfoFromDate,
  getWeekInfoFromWeekStr,
  getWeekStartNumber,
} from "../../_utils/utils.DateSelector";
import DayCalendar from "./DayCalendar";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type DateSelectorProps = {
  type: CalendarType;
  weekStart?: number | string; // 0 for Sunday, 1 for Monday, etc.
};

// Custom hook for detecting clicks outside an element
function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function DateSelector({ type, weekStart = 1 }: DateSelectorProps) {
  const { setDate, setWeek, setMonth, date, week, month, setNavigating } =
    useCalendarStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const weekStartNumber = getWeekStartNumber(weekStart);
    moment.updateLocale("en", {
      week: {
        dow: weekStartNumber, // Set the start of the week (0 = Sunday, 1 = Monday, etc.)
      },
    });
  }, [weekStart]);

  useEffect(() => {
    if (type !== "week" || !date) return;
    const { weekStr } = getWeekInfoFromDate(date, weekStart);
    if (weekStr !== week) setWeek(weekStr);
  }, [type, date, weekStart, week, setWeek]);

  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  // Get display value based on type
  const getDisplayValue = () => {
    if (type === "week") {
      const { displayRange } = getWeekInfoFromDate(date, weekStart);
      return displayRange;
    }
    if (type === "month" && month) {
      return moment(month, "YYYY-MM").format("MMM YYYY");
    }
    return moment(date, "YYYY-MM-DD").format("MM-DD-YYYY");
  };
  // Handle day picker
  const handleDaySelection = (newDate: string) => {
    setDate(newDate);
    setIsOpen(false);
    if (type !== "day" && type !== "list") {
      setNavigating(true);
      router.push("day");
    }
  };

  const handleDayStep = (newDate: string) => {
    setDate(newDate);
  };

  // Handle week selection
  const handleWeekSelection = (newWeek: string) => {
    setWeek(newWeek);
    const weekStartNumber = getWeekStartNumber(weekStart);
    moment.updateLocale("en", {
      week: {
        dow: weekStartNumber,
      },
    });
    const { startDate } = getWeekInfoFromWeekStr(newWeek, weekStart);
    const firstDayOfWeek = startDate;
    setDate(firstDayOfWeek);

    setIsOpen(false);
    if (type !== "week") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push("week");

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
  };

  // Handle month selection
  const handleMonthSelection = (newMonth: string) => {
    setMonth(newMonth);

    const firstDayOfMonth = moment(newMonth)
      .startOf("month")
      .format("YYYY-MM-DD");
    setDate(firstDayOfMonth);

    setIsOpen(false);
    if (type !== "month") {
      setNavigating(true);
      router.push("month");
    }
  };

  // Generate the calendar content based on type
  const renderCalendarContent = () => {
    if (type === "day") {
      return (
        <DayCalendar
          selectedDate={date || moment().format("YYYY-MM-DD")}
          onSelect={handleDaySelection}
          onStep={handleDayStep}
          weekStart={weekStart}
        />
      );
    } else if (type === "week") {
      return (
        <WeekCalendar
          selectedWeek={week || moment().format("YYYY-[W]WW")}
          onSelect={handleWeekSelection}
          weekStart={weekStart}
        />
      );
    } else if (type === "month") {
      return (
        <MonthCalendar
          selectedMonth={month || moment().format("YYYY-MM")}
          onSelect={handleMonthSelection}
        />
      );
    } else if (type === "list") {
      return (
        <DayCalendar
          selectedDate={date || moment().format("YYYY-MM-DD")}
          onSelect={handleDaySelection}
          onStep={handleDayStep}
          weekStart={weekStart}
        />
      );
    }
    return null;
  };

  const TRANSITION_UTILITY = "transition-all duration-300 ease-in-out";

  const textStyle = "text-slate-600 dark:text-slate-300";
  const iconStyle = "text-slate-400 dark:text-slate-500";

  return (
    <div className="relative flex-1 lg:flex-none" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex-1 lg:flex-none w-full lg:w-auto"
      >
        <span className="flex flex-1 lg:flex-none items-center gap-2">
          {/* Calendar Icon: Subtle coloring */}
          <CalendarDays size={18} className={iconStyle} />
          {/* Display Value: Core data using specified text color */}
          <span className={`${textStyle} font-medium`}>
            {getDisplayValue()}
          </span>
        </span>

        {/* Chevron Icon: Rotates on open, smooth transition */}
        <ChevronDown
          size={16}
          className={`${iconStyle} ${TRANSITION_UTILITY} ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-auto min-w-[280px] max-w-[calc(100vw-1rem)] rounded-md border border-gray-200 bg-white shadow-lg">
          {renderCalendarContent()}
        </div>
      )}
    </div>
  );
}

export default DateSelector;
