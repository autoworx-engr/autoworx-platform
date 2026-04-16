import { create } from "zustand";

interface ITeamManagement {
  refetch: boolean;
}
export const useTeamManagementStore = create<ITeamManagement>((set) => ({
  refetch: false,
  setRefetch: (refetch: boolean) => set({ refetch }),
}));
