import { create } from "zustand";

interface ClientFilterState {
  search: string;
  setFilter({ search }: { search?: string }): void;
  currentPage: number;
  pageSize: number;
  setCurrentPage(currentPage: number): void;
  setPageSize(pageSize: number): void;
  setClear(): void;
}

export const useClientFilterStore = create<ClientFilterState>((set) => ({
  search: "",
  currentPage: 1,
  pageSize: 50,
  setFilter: ({ search }) =>
    set((state) => {
      if (search !== undefined && search !== state.search) {
        return { search, currentPage: 1 };
      }
      return { search: search ?? state.search };
    }),
  setCurrentPage: (currentPage) =>
    set((state) => ({
      currentPage: currentPage ?? state.currentPage,
    })),
  setPageSize: (pageSize) =>
    set((state) => {
      if (pageSize !== undefined && pageSize !== state.pageSize) {
        return { pageSize, currentPage: 1 };
      }
      return { pageSize: pageSize ?? state.pageSize };
    }),
  setClear: () =>
    set((state) => ({
      search: "",
      currentPage: 1,
      pageSize: 50,
    })),
}));

type DemoClientFilterState = {
  searchTerm: string;
  filter: string;
  setFilter(search: string): void;
  setSearchTerm(searchTerm: string): void;
  setClear(): void;
};

export const useDemoClientFilterStore = create<DemoClientFilterState>(
  (set) => ({
    searchTerm: "",
    filter: "All",
    setSearchTerm: (searchTerm) =>
      set((state) => ({
        searchTerm: searchTerm ?? state.searchTerm,
      })),
    setFilter: (filter) =>
      set((state) => ({
        filter: filter ?? state.filter,
      })),
    setClear: () =>
      set((state) => ({
        searchTerm: "",
        filter: "All",
      })),
  }),
);
