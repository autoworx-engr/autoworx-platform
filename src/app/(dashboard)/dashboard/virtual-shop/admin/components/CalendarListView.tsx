"use client";

import type { Appointment } from "./CalendarTab.types";
import CalendarAppointmentCard from "./CalendarAppointmentCard";

export default function CalendarListView({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const grouped: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });
  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
        <p className="text-sm font-medium">
          No appointments found for this month
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const [y, m, d] = dateKey.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const label = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return (
          <div key={dateKey}>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 sm:mb-3">
              {label}
            </p>
            <div className="space-y-3">
              {grouped[dateKey].map((a) => (
                <CalendarAppointmentCard key={a.id} appt={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
