"use client";

import type { Appointment } from "./CalendarTab.types";
import {
  DAY_LABELS,
  STATUS_DOT,
  formatDateKey,
  getDaysInMonth,
  getFirstDayOfMonth,
  isSameDay,
} from "./CalendarTab.utils";

export default function CalendarGrid({
  year,
  month,
  appointments,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const apptByDate: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!apptByDate[a.date]) apptByDate[a.date] = [];
    apptByDate[a.date].push(a);
  });

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
      {DAY_LABELS.map((d) => (
        <div
          key={d}
          className="bg-slate-50 dark:bg-slate-800 text-center text-[9px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-2 sm:py-3"
        >
          {d}
        </div>
      ))}

      {cells.map((day, idx) => {
        if (day === null) {
          return (
            <div
              key={`empty-${idx}`}
              className="bg-white dark:bg-slate-900 min-h-[52px] sm:min-h-[80px] md:min-h-[88px]"
            />
          );
        }

        const dateKey = formatDateKey(year, month, day);
        const dayAppts = apptByDate[dateKey] ?? [];
        const isSelected = isSameDay(dateKey, selectedDate);
        const isToday = isSameDay(dateKey, todayKey);

        return (
          <button
            key={dateKey}
            onClick={() => onSelectDate(dateKey)}
            className={`relative bg-white dark:bg-slate-900 min-h-[52px] sm:min-h-[80px] md:min-h-[88px] p-1 sm:p-2 flex flex-col items-start text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none ${
              isSelected
                ? "ring-2 ring-inset ring-primary bg-primary/5 dark:bg-primary/10"
                : ""
            }`}
          >
            <span
              className={`text-[9px] sm:text-xs font-semibold mb-0.5 sm:mb-1.5 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "text-primary bg-primary/15 dark:bg-primary/25"
                    : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {day}
            </span>
            {dayAppts.length > 0 && (
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${STATUS_DOT[a.status]}`}
                  />
                ))}
                {dayAppts.length > 3 && (
                  <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    +{dayAppts.length - 3}
                  </span>
                )}
              </div>
            )}
            {dayAppts.length > 0 && (
              <p className="hidden md:block mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate w-full leading-tight">
                {dayAppts[0].clientName}
                {dayAppts.length > 1 && ` +${dayAppts.length - 1}`}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
