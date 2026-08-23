import { CalendarSettings } from "@prisma/client";
import { create } from "zustand";

interface CalendarSettingsStore {
  calendarSettings: CalendarSettings | null;
  loading: boolean;
  error: string | null;
  fetchCalendarSettings: () => Promise<void>;
}

export const useCalendarSettingsStore = create<CalendarSettingsStore>(
  (set) => ({
    calendarSettings: null,
    loading: false,
    error: null,

    fetchCalendarSettings: async () => {
      try {
        set({ loading: true, error: null });
        const res = await fetch("/api/calendar-settings");
        if (!res.ok) throw new Error("Failed to fetch calendar settings");

        const json = await res.json();
        set({ calendarSettings: json.data, loading: false });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
  }),
);
