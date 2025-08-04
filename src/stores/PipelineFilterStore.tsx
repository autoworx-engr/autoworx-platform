import { create } from "zustand";

interface pipelineFilter {
  searchTerm: string;
  dateRange: [Date | null, Date | null];
  status: string;
  service: string;
}
interface pipelineFilterType extends pipelineFilter {
  setFilter({
    searchTerm,
    dateRange,
    status,
    service,
  }: {
    searchTerm?: string;
    dateRange?: [Date | null, Date | null];
    status?: string | null;
    service?: string | null;
  }): void;
  resetStatus(): void;
}

const initialState: pipelineFilter = {
  searchTerm: "",
  dateRange: [null, null],
  status: "",
  service: "",
};
export const usePipelineFilterStore = create<pipelineFilterType>((set) => ({
  ...initialState,
  setFilter: ({ searchTerm, dateRange, status, service }) =>
    set((state) => ({
      searchTerm: searchTerm ?? state.searchTerm,
      dateRange: dateRange ?? state.dateRange,
      status: status ?? state.status,
      service: service ?? state.service,
    })),
  resetStatus: () => set(initialState),
}));
