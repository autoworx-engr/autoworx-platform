import { create } from "zustand";

interface InventoryFilterState {
  search: string;
  category: string;
  setFilter({ search, category }: { search?: string; category?: string }): void;
}

export const useInventoryFilterStore = create<InventoryFilterState>((set) => ({
  search: "",
  category: "All Categories",
  setFilter: ({ search, category }) =>
    set((state) => ({
      search: search !== undefined ? search : state.search,
      category: category !== undefined ? category : state.category,
    })),
}));
