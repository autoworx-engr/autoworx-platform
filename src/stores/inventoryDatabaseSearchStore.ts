import { create } from "zustand";

type NavigationStore = {
  search: string;
  categoryName: string;
  page: number;
  limit: number;

  setSearch: (search: string) => void;
  setCategoryName: (category: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  resetFilters: () => void;
};

export const useInventoryDatabaseSearchStore = create<NavigationStore>(
  (set) => ({
    search: "",
    categoryName: "",
    page: 1,
    limit: 50,

    setSearch: (search) => set({ search }),
    setCategoryName: (categoryName) => set({ categoryName }),
    setPage: (page) => set({ page }),
    setLimit: (limit) => set({ limit }),

    resetFilters: () =>
      set({
        search: "",
        categoryName: "",
        page: 1,
        limit: 50,
      }),
  }),
);
