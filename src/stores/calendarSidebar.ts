import { create } from "zustand";

export const CALENDAR_SIDEBAR_EXPAND_BREAKPOINT = 1280;

interface CalendarSidebarStore {
  type: "USERS" | "TASKS";
  minimized: boolean;
  userToggled: boolean;
  setType: (calenderType: "USERS" | "TASKS") => void;
  toggleMinimized: () => void;
  setMinimized: (minimized: boolean) => void;
  applyViewportDefault: (minimized: boolean) => void;
}

export const useCalendarSidebarStore = create<CalendarSidebarStore>((set) => ({
  type: "TASKS",
  // Collapsed is only the pre-measurement value: `applyViewportDefault` opens
  // the panel on wide screens as soon as the media query resolves.
  minimized: true,
  userToggled: false,
  setType: (type) => set({ type }),
  toggleMinimized: () =>
    set((state) => ({ minimized: !state.minimized, userToggled: true })),
  setMinimized: (minimized) => set({ minimized, userToggled: true }),
  applyViewportDefault: (minimized) =>
    set((state) => (state.userToggled ? state : { minimized })),
}));
