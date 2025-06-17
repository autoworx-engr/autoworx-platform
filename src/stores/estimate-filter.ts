import { create } from "zustand";

interface EstimateFilterState {
  dateRange: [Date | null, Date | null];
  status: string[];
  search: string;
  setFilter({
    dateRange,
    status,
    search,
  }: {
    dateRange?: [Date | null, Date | null];
    status?: string[]; // Expecting an array of strings here
    search?: string;
  }): void;
  resetStatus(): void;
}

export const useEstimateFilterStore = create<EstimateFilterState>((set) => ({
  dateRange: [null, null],
  status: [],
  search: "",
  setFilter: ({ dateRange, status, search }) =>
    set((state) => ({
      dateRange: dateRange ?? state.dateRange,
      status: status ?? state.status,
      search: search ?? state.search,
    })),
  resetStatus: () => set({ status: [], search: "", dateRange: [null, null] }),
}));
