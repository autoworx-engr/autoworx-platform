"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IoCalendarOutline, IoChevronDown } from "react-icons/io5";
import DayCalendar from "./DayCalendar";
import MonthCalendar from "./MonthCalendar";
import {
  getWeekInfoFromWeekStr,
  getWeekStartNumber,
} from "./utils.DateSelector";
import WeekCalendar from "./WeekCalendar";

const BUTTON_STYLE = "app-shadow rounded-md p-2 text-[#797979]";

type DateSelectorProps = {
  type: CalendarType;
  weekStart?: number | string; // 0 for Sunday, 1 for Monday, etc.
};

// Custom hook for detecting clicks outside an element
function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
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

  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  // Get display value based on type
  const getDisplayValue = () => {
    if (type === "week" && week) {
      const { displayRange } = getWeekInfoFromWeekStr(week, weekStart);
      return displayRange; // Return the formatted week range
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
    if (type !== "day") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push("day");

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
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
    // Parse the year and week number
    const [year, weekNum] = newWeek.split("-W").map(Number);

    // Calculate the first day of the selected week
    const firstDayOfWeek = moment()
      .year(year)
      .isoWeek(weekNum)
      .startOf("isoWeeks")
      .format("YYYY-MM-DD");
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

    // Also update the date to the first day of the month
    const firstDayOfMonth = moment(newMonth)
      .startOf("month")
      .format("YYYY-MM-DD");
    setDate(firstDayOfMonth);

    setIsOpen(false);
    if (type !== "month") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push("month");

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
  };

  // Generate the calendar content based on type
  const renderCalendarContent = () => {
    if (type === "day") {
      return (
        <DayCalendar
          selectedDate={date || moment().format("YYYY-MM-DD")}
          onSelect={handleDaySelection}
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
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`${BUTTON_STYLE} flex min-w-[150px] items-center justify-between gap-2 text-xs lg:text-sm`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          <IoCalendarOutline className="text-lg" />
          <span>{getDisplayValue()}</span>
        </span>
        <IoChevronDown
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-auto min-w-[280px] rounded-md border border-gray-200 bg-white shadow-lg">
          {renderCalendarContent()}
        </div>
      )}
    </div>
  );
}

export default DateSelector;
