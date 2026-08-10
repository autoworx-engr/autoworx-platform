import { useState } from "react";
import moment from "moment";
import { getWeekStartNumber } from "../../_utils/utils.DateSelector";

export default function WeekCalendar({
  selectedWeek,
  onSelect,
  weekStart = 1,
}: {
  selectedWeek: string;
  onSelect: (week: string) => void;
  weekStart: number | string;
}) {
  moment.updateLocale("en", { week: { dow: getWeekStartNumber(weekStart) } });

  // Parse the selected week
  const [year, weekNum] = selectedWeek.split("-W");
  const [selectedYear, setSelectedYear] = useState(parseInt(year));
  const [viewMonth, setViewMonth] = useState(
    moment().year(parseInt(year)).week(parseInt(weekNum)).month(),
  );

  // Get weeks in the month with consistent week numbering
  const getWeeksInViewMonth = () => {
    const firstDayOfMonth = moment()
      .year(selectedYear)
      .month(viewMonth)
      .startOf("month");
    const lastDayOfMonth = moment(firstDayOfMonth).endOf("month");

    // Add a week before and after to ensure we cover the entire month's view
    const startDate = moment(firstDayOfMonth).subtract(1, "week");
    const endDate = moment(lastDayOfMonth).add(1, "week");

    const weeks = [];
    let currentDay = moment(startDate).startOf("week");

    // Iterate through all weeks that overlap with the month
    while (currentDay.isBefore(endDate)) {
      // Use week() consistently instead of mixing isoWeek() and week()
      const weekNumber = currentDay.week();
      // Get the correct year for the week (important for weeks crossing year boundaries)
      const weekYear = currentDay.weekYear();

      const weekStart = moment(currentDay);
      const weekEnd = moment(currentDay).endOf("week");

      // Only include this week if it overlaps with the current view month
      const isInViewMonth =
        (weekStart.month() === viewMonth &&
          weekStart.year() === selectedYear) ||
        (weekEnd.month() === viewMonth && weekEnd.year() === selectedYear);

      if (isInViewMonth) {
        weeks.push({
          weekStr: `${weekYear}-W${weekNumber.toString().padStart(2, "0")}`,
          weekNumber,
          start: weekStart.format("MMM D"),
          end: weekEnd.format("MMM D"),
          isSelected:
            `${weekYear}-W${weekNumber.toString().padStart(2, "0")}` ===
            selectedWeek,
          isCurrent: moment().isBetween(weekStart, weekEnd, null, "[]"),
        });
      }

      currentDay.add(1, "week");
    }

    return weeks;
  };

  const weeks = getWeeksInViewMonth();

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToCurrentWeek = () => {
    const now = moment();
    setSelectedYear(now.year());
    setViewMonth(now.month());
    onSelect(now.format("YYYY-[W]WW"));
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">
          {moment().month(viewMonth).year(selectedYear).format("MMMM YYYY")}
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={goToCurrentWeek}
            className="rounded px-2 py-1 text-xs hover:bg-gray-100"
          >
            Current
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {weeks.map((week, index) => (
          <button
            key={index}
            onClick={() => onSelect(week.weekStr)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${
              week.isSelected
                ? "bg-blue-500 text-white"
                : week.isCurrent
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100"
            } `}
          >
            <span>Week {week.weekNumber}</span>
            <span>
              {week.start} - {week.end}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
