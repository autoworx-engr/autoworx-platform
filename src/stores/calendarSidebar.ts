import { create } from "zustand";

interface CalendarSidebarStore {
  type: "USERS" | "TASKS";
  minimized: boolean;
  setType: (calenderType: "USERS" | "TASKS") => void;
  toggleMinimized: () => void;
  setMinimized: (minimized: boolean) => void;
}

export const useCalendarSidebarStore = create<CalendarSidebarStore>((set) => ({
  type: "TASKS",
  // Starts collapsed so the calendar gets the full width by default — the
  // sidebar is a secondary panel and is expanded on demand.
  minimized: true,
  setType: (type) => set({ type }),
  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),
  setMinimized: (minimized) => set({ minimized }),
}));
