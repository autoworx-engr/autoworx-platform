"use client";

import { memo } from "react";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BUTTON_STYLE = `
  // Base look: Clean background, premium ring border, rounded-md corners
  bg-white/50 backdrop-blur-sm 
  rounded-md ring-1 ring-slate-900/5 dark:bg-slate-900/50 dark:ring-slate-700/50
  p-2 border
  // Text & Color: Professional slate tones
  text-slate-600 dark:text-slate-300 font-medium text-sm
  // Interaction: Smooth transition and subtle hover
  transition-all duration-300 ease-in-out
  hover:bg-white/80 dark:hover:bg-slate-800/80
  hover:-translate-y-0.5 hover:shadow-md
`;

type ArrowButtonProps = {
  direction: "back" | "forward";
  type: CalendarType;
  calenderQueryType: string;
};

function ArrowButton({ direction, type, calenderQueryType }: ArrowButtonProps) {
  const { date, week, month, setDate, setWeek, setMonth } = useCalendarStore();

  const amount = direction === "back" ? -1 : 1;
  const icon =
    direction === "back" ? (
      <ChevronLeft size={20} />
    ) : (
      <ChevronRight size={20} />
    );

  const isDay = calenderQueryType === "date";
  const isWeek = calenderQueryType === "week";
  const isMonth = calenderQueryType === "month";

  function handleClick() {
    let param = isDay ? date : isWeek ? week : isMonth ? month : null;

    if (!param) return; // Exit if no valid param is found

    let year: number | undefined,
      monthValue: number | undefined,
      day: number | undefined,
      weekNum: number | undefined;

    // Parse the current param
    if (isWeek && param.includes("W")) {
      [year, weekNum] = param.split("-W").map(Number);
    } else if (isMonth || isDay) {
      const parts = param.split("-").map(Number);
      year = parts[0];
      monthValue = parts[1] - 1; // Month is zero-based
      day = parts[2];
    }

    let newYear: number | undefined,
      newMonth: number | undefined,
      newDay: number | undefined,
      newWeek: number | undefined;
    let formattedDate: string | undefined;

    // Handle week navigation
    if (isWeek && year && weekNum) {
      newWeek = weekNum + amount;
      newYear = year;

      if (newWeek > 52) {
        newWeek = 1;
        newYear++;
      } else if (newWeek < 1) {
        newWeek = 52;
        newYear--;
      }

      formattedDate = `${newYear}-W${newWeek.toString().padStart(2, "0")}`;
      setWeek(formattedDate);
    }
    // Handle month navigation
    else if (isMonth && year && monthValue !== undefined) {
      newMonth = monthValue + amount;
      newYear = year;

      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }

      formattedDate = `${newYear}-${(newMonth + 1).toString().padStart(2, "0")}`;
      setMonth(formattedDate);
    }
    // Handle day navigation
    else if (isDay && year && monthValue !== undefined && day) {
      const newDate = new Date(year, monthValue, day + amount);

      newYear = newDate.getFullYear();
      newMonth = newDate.getMonth();
      newDay = newDate.getDate();

      formattedDate = `${newYear}-${(newMonth + 1)
        .toString()
        .padStart(2, "0")}-${newDay.toString().padStart(2, "0")}`;
      setDate(formattedDate);
    }
  }

  return (
    <button
      type="button"
      className={BUTTON_STYLE}
      onClick={handleClick}
      aria-label={`Go to ${direction === "back" ? "previous" : "next"} ${type}`}
    >
      {icon}
    </button>
  );
}

export default memo(ArrowButton);
