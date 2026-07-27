"use client";

import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import {
  useGetShopBookingSettings,
  useUpdateShopBookingSettings,
} from "@/hooks/virtual-shop/booking-settings/useShopBookingSettings";
import { useCalendarSettingsStore } from "@/stores/calendarSettingsStore";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

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

type ApiDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

const UI_TO_API_DAY: Record<Day, ApiDay> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

const API_TO_UI_DAY: Record<ApiDay, Day> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

function normalizeToDay(value?: string | null): Day | null {
  if (!value) return null;
  const normalized = `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
  return DAYS.includes(normalized as Day) ? (normalized as Day) : null;
}

function getCompanyFallbackSchedules(
  calendarSettings: {
    dayStart?: string | null;
    dayEnd?: string | null;
    weekend1?: string | null;
    weekend2?: string | null;
  } | null,
): Record<Day, DaySchedule> {
  const fallback = {} as Record<Day, DaySchedule>;

  const dayStart = calendarSettings?.dayStart || "09:00";
  const dayEnd = calendarSettings?.dayEnd || "17:00";

  const weekend1 = normalizeToDay(calendarSettings?.weekend1);
  const weekend2 = normalizeToDay(calendarSettings?.weekend2);
  const weekendSet = new Set<Day>(
    [weekend1, weekend2].filter(Boolean) as Day[],
  );

  for (const day of DAYS) {
    fallback[day] = {
      enabled: !weekendSet.has(day),
      start: dayStart,
      end: dayEnd,
    };
  }

  return fallback;
}

type SchedulingTabProps = {
  shopId?: number;
};

export default function SchedulingTab({ shopId = 0 }: SchedulingTabProps) {
  const { data: session } = useSession();
  const {
    calendarSettings,
    fetchCalendarSettings,
    loading: isCalendarSettingsLoading,
  } = useCalendarSettingsStore();

  const {
    data: bookingSettings,
    isLoading: isBookingSettingsLoading,
    isFetched: hasFetchedBookingSettings,
  } = useGetShopBookingSettings(shopId);
  const { mutateAsync: updateBookingSettings, isPending: isSaving } =
    useUpdateShopBookingSettings(shopId);

  const [stacking, setStacking] = useState(false);
  const [stackingLimit, setStackingLimit] = useState("1");
  const [timeSlotInterval, setTimeSlotInterval] = useState("30");
  const [schedules, setSchedules] = useState<Record<Day, DaySchedule>>(() =>
    getCompanyFallbackSchedules(null),
  );

  const updateSchedule = (day: Day, patch: Partial<DaySchedule>) => {
    setSchedules((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const isLoading = isBookingSettingsLoading || isCalendarSettingsLoading;
  const isHydratingBookingSettings = shopId > 0 && !hasFetchedBookingSettings;

  const parsedStackingLimit = useMemo(() => {
    const next = Number(stackingLimit);
    return Number.isInteger(next) ? next : NaN;
  }, [stackingLimit]);

  const parsedSlotInterval = useMemo(() => {
    const next = Number(timeSlotInterval);
    return Number.isInteger(next) ? next : NaN;
  }, [timeSlotInterval]);

  useEffect(() => {
    fetchCalendarSettings();
  }, [fetchCalendarSettings]);

  useEffect(() => {
    const companyFallback = getCompanyFallbackSchedules(calendarSettings);

    if (!bookingSettings) {
      setSchedules(companyFallback);
      return;
    }

    setStacking(Boolean(bookingSettings.isStackingEnabled));
    setStackingLimit(String(bookingSettings.stackingLimit ?? 1));
    setTimeSlotInterval(String(bookingSettings.slotInterval ?? 30));

    const hasApiAvailabilities =
      Array.isArray(bookingSettings.availabilities) &&
      bookingSettings.availabilities.length > 0;

    const nextSchedules: Record<Day, DaySchedule> = { ...companyFallback };

    if (hasApiAvailabilities) {
      bookingSettings.availabilities.forEach((availability) => {
        const uiDay = API_TO_UI_DAY[availability.dayOfWeek as ApiDay];
        if (!uiDay) return;

        nextSchedules[uiDay] = {
          enabled: Boolean(availability.isOpen),
          start: availability.startTime || companyFallback[uiDay].start,
          end: availability.endTime || companyFallback[uiDay].end,
        };
      });
    }

    setSchedules(nextSchedules);
  }, [bookingSettings, calendarSettings]);

  const handleSave = async () => {
    if (!shopId) {
      toast.error("Shop is not configured yet");
      return;
    }

    if (!session?.accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    if (
      stacking &&
      (!Number.isInteger(parsedStackingLimit) || parsedStackingLimit < 1)
    ) {
      toast.error("Stacking limit must be at least 1");
      return;
    }

    if (!Number.isInteger(parsedSlotInterval) || parsedSlotInterval < 5) {
      toast.error("Time slot interval must be at least 5 minutes");
      return;
    }

    for (const day of DAYS) {
      const schedule = schedules[day];
      if (!schedule.enabled) continue;

      if (!schedule.start || !schedule.end) {
        toast.error(`${day}: start and end times are required`);
        return;
      }

      if (schedule.start >= schedule.end) {
        toast.error(`${day}: end time must be later than start time`);
        return;
      }
    }

    try {
      await updateBookingSettings({
        payload: {
          shopId,
          isStackingEnabled: stacking,
          stackingLimit: stacking ? parsedStackingLimit : 1,
          slotInterval: parsedSlotInterval,
          availabilities: DAYS.map((day) => {
            const schedule = schedules[day];
            return {
              dayOfWeek: UI_TO_API_DAY[day],
              isOpen: schedule.enabled,
              startTime: schedule.enabled ? schedule.start : null,
              endTime: schedule.enabled ? schedule.end : null,
            };
          }),
        },
        accessToken: session.accessToken,
      });

      toast.success("Scheduling settings saved successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Failed to save scheduling settings";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-[560px] rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Appointment Logic</h2>
      <p className="mt-1 text-sm text-primary">
        Configure scheduling rules and availability
      </p>

      {isHydratingBookingSettings && (
        <div className="mt-6 flex flex-col gap-5 animate-pulse">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-44 rounded bg-gray-200" />
                <div className="h-4 w-56 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-200" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-10 w-24 rounded bg-gray-200" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="h-10 w-24 rounded bg-gray-200" />
          </div>

          <div className="space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="h-6 w-11 rounded-full bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-9 w-28 rounded bg-gray-200" />
                <div className="h-4 w-6 rounded bg-gray-200" />
                <div className="h-9 w-28 rounded bg-gray-200" />
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-end">
            <div className="h-10 w-36 rounded-md bg-gray-200" />
          </div>
        </div>
      )}

      {!isHydratingBookingSettings && (
        <>
          {/* Appointment Stacking */}
          <div className="mt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  Appointment Stacking
                </p>
                <p className="text-sm text-gray-400">
                  Allow overlapping appointments
                </p>
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
                  className="w-24 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
              className="w-24 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Day Availability */}
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">
              Day Availability
            </p>

            {DAYS.map((day) => {
              const s = schedules[day];
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2"
                >
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
                        onChange={(e) =>
                          updateSchedule(day, { start: e.target.value })
                        }
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-400">to</span>
                      <input
                        type="time"
                        value={s.end}
                        onChange={(e) =>
                          updateSchedule(day, { end: e.target.value })
                        }
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isSaving || !shopId}
              className="bg-primary hover:bg-[#5a66ee]"
            >
              {isSaving ? "Saving..." : "Save Scheduling"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
