import moment from "moment";
import { useState } from "react";

export default function MonthCalendar({
  selectedMonth,
  onSelect,
}: {
  selectedMonth: string;
  onSelect: (month: string) => void;
}) {
  const [viewYear, setViewYear] = useState(
    parseInt(selectedMonth.split("-")[0]),
  );

  const months = moment.monthsShort().map((month, index) => {
    const monthStr = `${viewYear}-${(index + 1).toString().padStart(2, "0")}`;
    return {
      name: month,
      value: monthStr,
      isSelected: monthStr === selectedMonth,
      isCurrent: monthStr === moment().format("YYYY-MM"),
    };
  });

  const goToPrevYear = () => {
    setViewYear(viewYear - 1);
  };

  const goToNextYear = () => {
    setViewYear(viewYear + 1);
  };

  const goToCurrentMonth = () => {
    const currentMonth = moment().format("YYYY-MM");
    setViewYear(moment().year());
    onSelect(currentMonth);
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">{viewYear}</div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevYear}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={goToCurrentMonth}
            className="rounded px-2 py-1 text-xs hover:bg-gray-100"
          >
            Current
          </button>
          <button
            onClick={goToNextYear}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {months.map((month) => (
          <button
            key={month.value}
            onClick={() => onSelect(month.value)}
            className={`rounded-md px-3 py-2 text-sm ${
              month.isSelected
                ? "bg-blue-500 text-white"
                : month.isCurrent
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100"
            } `}
          >
            {month.name}
          </button>
        ))}
      </div>
    </div>
  );
}
