import { create } from "zustand";
import moment from "moment";

type CalendarState = {
  updateVariable: boolean;
  date: string | null;
  week: string | null;
  month: string | null;
  startTime: string | null;
  isNavigating: boolean;
  setUpdateVariable: () => void;
  setDate: (date: string) => void;
  setWeek: (week: string) => void;
  setMonth: (month: string) => void;
  setStartTime: (startTime: string | null) => void;
  setNavigating: (isNavigating: boolean) => void;
  reset: () => void;
};

export const useCalendarStore = create<CalendarState>((set) => {
  const today = moment();
  const currentDate = today.format("YYYY-MM-DD");
  const currentWeek = today.format("YYYY-[W]WW");
  const currentMonth = today.format("YYYY-MM");
  return {
    updateVariable: true,
    date: currentDate,
    week: currentWeek,
    month: currentMonth,
    startTime: null,
    isNavigating: false,
    setUpdateVariable: () => set((state) => ({ updateVariable: !state.updateVariable })),
    setDate: (date) => set({ date }),
    setWeek: (week) => set({ week }),
    setMonth: (month) => set({ month }),
    setStartTime: (startTime) => set({ startTime }),
    setNavigating: (isNavigating) => set({ isNavigating }),
    reset: () =>
      set({
        date: currentDate,
        week: currentWeek,
        month: currentMonth,
        startTime: null,
        isNavigating: false,
      }),
  };
});
