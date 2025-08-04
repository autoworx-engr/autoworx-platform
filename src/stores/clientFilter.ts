import { create } from "zustand";

interface ClientFilterState {
  search: string;
  setFilter({ search }: { search?: string }): void;
}

export const useClientFilterStore = create<ClientFilterState>((set) => ({
  search: "",
  setFilter: ({ search }) =>
    set((state) => ({
      search: search ?? state.search,
    })),
}));

type DemoClientFilterState = {
  searchTerm: string;
  filter: string;
  setFilter(search: string): void;
  setSearchTerm(searchTerm: string): void;
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
  }),
);
