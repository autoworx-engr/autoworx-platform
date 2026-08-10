import { create } from "zustand";

interface EmployeeWorkFilterState {
  dateRange: [Date | null, Date | null];
  amount: [number, number];
  search: string;
  service: string;
  category: string;
  status: string | null;
  setFilter({
    dateRange,
    amount,
    search,
    service,
    category,
    status,
  }: {
    dateRange?: [Date | null, Date | null];
    amount?: [number, number];
    search?: string;
    service?: string;
    category?: string;
    status?: string | null;
  }): void;
}

export const useEmployeeWorkFilterStore = create<EmployeeWorkFilterState>(
  (set) => ({
    dateRange: [null, null],
    amount: [1, 30000], // TODO
    search: "",
    service: "",
    category: "",
    status: null,
    setFilter: ({ dateRange, amount, search, service, category, status }) =>
      set((state) => ({
        dateRange: dateRange || state.dateRange,
        amount: amount || state.amount,
        search: search !== undefined ? search : state.search,
        service: service !== undefined ? service : state.service,
        category: category !== undefined ? category : state.category,
        status: status !== undefined ? status : state.status,
      })),
  }),
);
