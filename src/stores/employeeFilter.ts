import { create } from "zustand";

export type EmployeeType = "Sales" | "Technician" | "All";

interface EmployeeFilterState {
  dateRange: [Date | null, Date | null];
  type: EmployeeType;
  search: string;
  currentPage: number;
  pageSize: number;
  setFilter({
    dateRange,
    type,
    search,
  }: {
    dateRange?: [Date | null, Date | null];
    type?: EmployeeType;
    search?: string;
    currentPage?: number;
    pageSize?: number;
  }): void;
  setPaginate({
    currentPage,
    pageSize,
  }: {
    currentPage?: number;
    pageSize?: number;
  }): void;
}

export const useEmployeeFilterStore = create<EmployeeFilterState>((set) => ({
  dateRange: [null, null],
  type: "All",
  search: "",
  currentPage: 1,
  pageSize: 50,
  setFilter: ({ dateRange, type, search }) =>
    set((state) => ({
      dateRange: dateRange !== undefined ? dateRange : state.dateRange,
      type: type || state.type,
      search: search ?? state.search,
    })),
  setPaginate: ({ currentPage, pageSize }) =>
    set((state) => ({
      currentPage: currentPage ?? state.currentPage,
      pageSize: pageSize || state.pageSize,
    })),
}));
