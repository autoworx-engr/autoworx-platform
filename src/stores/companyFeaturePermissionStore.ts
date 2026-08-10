import { create } from "zustand";

export type CompanyFeaturePermission = {
  id: string;
  permission_name: string;
  companyId: number;
  enabled: boolean;
};

interface CompanyFeaturePermissionStore {
  companyFeaturePermission: CompanyFeaturePermission[];
  isLoading: boolean;
  setCompanyFeaturePermission: (
    companyFeaturePermission: CompanyFeaturePermission[],
  ) => void;
  setLoading: (loading: boolean) => void;
  clearCompanyFeaturePermission: () => void;
}

export const useCompanyFeaturePermissionStore =
  create<CompanyFeaturePermissionStore>((set) => ({
    isLoading: false,
    companyFeaturePermission: [],
    setCompanyFeaturePermission: (companyFeaturePermission) =>
      set({ companyFeaturePermission, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    clearCompanyFeaturePermission: () =>
      set({ companyFeaturePermission: [], isLoading: false }),
  }));
