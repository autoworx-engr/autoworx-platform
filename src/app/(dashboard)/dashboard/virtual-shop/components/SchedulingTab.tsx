"use client";

import { useState } from "react";
import { Switch } from "@/components/Switch";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type Day = (typeof DAYS)[number];

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

const DEFAULT_SCHEDULES: Record<Day, DaySchedule> = {
  Monday: { enabled: false, start: "08:00", end: "18:00" },
  Tuesday: { enabled: true, start: "08:00", end: "18:00" },
  Wednesday: { enabled: true, start: "08:00", end: "18:00" },
  Thursday: { enabled: true, start: "08:00", end: "18:00" },
  Friday: { enabled: true, start: "08:00", end: "18:00" },
  Saturday: { enabled: true, start: "09:00", end: "16:00" },
  Sunday: { enabled: false, start: "08:00", end: "18:00" },
};

function formatTime(value: string) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function SchedulingTab() {
  const [stacking, setStacking] = useState(true);
  const [stackingLimit, setStackingLimit] = useState("2");
  const [timeSlotInterval, setTimeSlotInterval] = useState("30");
  const [schedules, setSchedules] = useState<Record<Day, DaySchedule>>(DEFAULT_SCHEDULES);

  const updateSchedule = (day: Day, patch: Partial<DaySchedule>) => {
    setSchedules((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Appointment Logic</h2>
      <p className="mt-1 text-sm text-[#6571FF]">
        Configure scheduling rules and availability
      </p>

      {/* Appointment Stacking */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">Appointment Stacking</p>
            <p className="text-sm text-gray-400">Allow overlapping appointments</p>
          </div>
          <Switch checked={stacking} setChecked={setStacking} />
        </div>

        {stacking && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Stacking Limit
            </label>
            <input
              type="number"
              min="1"
              value={stackingLimit}
              onChange={(e) => setStackingLimit(e.target.value)}
              className="w-24 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
            />
          </div>
        )}
      </div>

      {/* Time Slot Interval */}
      <div className="mt-6 flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Time Slot Interval (minutes)
        </label>
        <input
          type="number"
          min="5"
          step="5"
          value={timeSlotInterval}
          onChange={(e) => setTimeSlotInterval(e.target.value)}
          className="w-24 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
        />
      </div>

      {/* Day Availability */}
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-700">Day Availability</p>

        {DAYS.map((day) => {
          const s = schedules[day];
          return (
            <div key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-4 shrink-0">
                <Switch
                  checked={s.enabled}
                  setChecked={(v) => updateSchedule(day, { enabled: v })}
                />
                <span className="w-24 text-sm text-gray-700">{day}</span>
              </div>

              {s.enabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="time"
                    value={s.start}
                    onChange={(e) => updateSchedule(day, { start: e.target.value })}
                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="time"
                    value={s.end}
                    onChange={(e) => updateSchedule(day, { end: e.target.value })}
                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

