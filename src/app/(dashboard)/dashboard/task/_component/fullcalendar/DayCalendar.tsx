import moment from "moment";
import { useEffect, useState } from "react";
import { getWeekStartNumber } from "../../_utils/utils.DateSelector";

export default function DayCalendar({
  selectedDate,
  onSelect,
  onStep,
  weekStart = 1,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  onStep?: (date: string) => void;
  weekStart: number | string;
}) {
  const [viewDate, setViewDate] = useState(moment(selectedDate));

  // Apply the weekStart configuration globally
  useEffect(() => {
    const weekStartNumber = getWeekStartNumber(weekStart);
    moment.updateLocale("en", {
      week: {
        dow: weekStartNumber, // Set the start of the week (0 = Sunday, 1 = Monday, etc.)
      },
    });
  }, [weekStart]);

  // Get days of the week starting from weekStart
  const daysOfWeek = [];
  const weekStartNumber = getWeekStartNumber(weekStart);
  for (let i = 0; i < 7; i++) {
    daysOfWeek.push((i + weekStartNumber) % 7);
  }

  // Get days for the current month view
  const getDaysInMonth = () => {
    const firstDay = moment(viewDate).startOf("month");
    const startWeekday = firstDay.day();

    // Adjust for week start day
    let daysToGoBack = startWeekday - weekStartNumber;
    if (daysToGoBack < 0) daysToGoBack += 7;

    const startDate = moment(firstDay).subtract(daysToGoBack, "days");
    const days = [];

    // Generate 6 weeks of dates (42 days)
    for (let i = 0; i < 42; i++) {
      const currentDate = moment(startDate).add(i, "days");
      days.push({
        date: currentDate.format("YYYY-MM-DD"),
        day: currentDate.date(),
        isCurrentMonth: currentDate.month() === viewDate.month(),
        isToday: currentDate.isSame(moment(), "day"),
        isSelected: currentDate.isSame(moment(selectedDate), "day"),
      });
    }

    return days;
  };

  const days = getDaysInMonth();

  const stepDay = (delta: number) => {
    const next = moment(selectedDate).add(delta, "day");
    setViewDate(next);
    (onStep ?? onSelect)(next.format("YYYY-MM-DD"));
  };

  const goToPrevDay = () => stepDay(-1);
  const goToNextDay = () => stepDay(1);

  const goToToday = () => {
    setViewDate(moment());
    onSelect(moment().format("YYYY-MM-DD"));
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">
          {viewDate.format("MMMM YYYY")}
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevDay}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={goToToday}
            className="rounded px-2 py-1 text-xs hover:bg-gray-100"
          >
            Today
          </button>
          <button
            onClick={goToNextDay}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Render day headers */}
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-xs font-medium text-gray-500"
          >
            {moment().day(day).format("dd")}{" "}
            {/* Short day name (e.g., Su, Mo, Tu) */}
          </div>
        ))}

        {/* Render days */}
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => onSelect(day.date)}
            className={`h-8 w-8 rounded-full text-sm ${
              !day.isCurrentMonth ? "text-gray-300" : ""
            } ${day.isToday ? "bg-blue-100 text-blue-700" : ""} ${
              day.isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-100"
            } `}
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  );
}
