import { create } from "zustand";

interface VendorFilterState {
  search: string;
  currentPage: number;
  pageSize: number;
  setCurrentPage(currentPage: number): void;
  setPageSize(pageSize: number): void;
}

export const useVendorFilterStore = create<VendorFilterState>((set) => ({
  search: "",
  currentPage: 1,
  pageSize: 50,
  setCurrentPage: (currentPage) =>
    set((state) => ({
      currentPage: currentPage ?? state.currentPage,
    })),
  setPageSize: (pageSize) =>
    set((state) => ({
      pageSize: pageSize ?? state.pageSize,
    })),
}));

type DemoVendorFilterState = {
  searchTerm: string;
  setSearchTerm(searchTerm: string): void;
};

export const useDemoVendorFilterStore = create<DemoVendorFilterState>(
  (set) => ({
    searchTerm: "",

    setSearchTerm: (searchTerm) =>
      set((state) => ({
        searchTerm: searchTerm ?? state.searchTerm,
      })),
  }),
);
