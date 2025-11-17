import { create } from "zustand";

interface ClientFilterState {
  search: string;
  setFilter({ search }: { search?: string }): void;
  currentPage: number;
  pageSize: number;
  setCurrentPage(currentPage: number): void;
  setPageSize(pageSize: number): void;
}

export const useClientFilterStore = create<ClientFilterState>(set => ({
  search: "",
  currentPage: 1,
  pageSize: 50,
  setFilter: ({ search }) =>
    set(state => ({
      search: search ?? state.search,
    })),
  setCurrentPage: currentPage =>
    set(state => ({
      currentPage: currentPage ?? state.currentPage,
    })),
  setPageSize: pageSize =>
    set(state => ({
      pageSize: pageSize ?? state.pageSize,
    })),
}));

type DemoClientFilterState = {
  searchTerm: string;
  filter: string;
  setFilter(search: string): void;
  setSearchTerm(searchTerm: string): void;
};

export const useDemoClientFilterStore = create<DemoClientFilterState>(set => ({
  searchTerm: "",
  filter: "All",
  setSearchTerm: searchTerm =>
    set(state => ({
      searchTerm: searchTerm ?? state.searchTerm,
    })),
  setFilter: filter =>
    set(state => ({
      filter: filter ?? state.filter,
    })),
}));
