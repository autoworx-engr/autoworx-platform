import { create } from "zustand";
import moment from "moment";

type CalendarState = {
  updateVariable: boolean;
  date: string | null;
  week: string | null;
  month: string | null;
  startTime: string | null;
  isNavigating: boolean;
  holidaySelectedYear: number;
  holidaySelectedMonth: string;
  setHolidaySelectedYear: (year: number) => void;
  setHolidaySelectedMonth: (month: string) => void;
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
    holidaySelectedYear: moment().year(),
    holidaySelectedMonth: moment().format("MMMM"),
    setUpdateVariable: () =>
      set((state) => ({ updateVariable: !state.updateVariable })),
    setHolidaySelectedYear: (year: number) =>
      set({ holidaySelectedYear: year }),
    setHolidaySelectedMonth: (month: string) =>
      set({ holidaySelectedMonth: month }),
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
