// stores/usePermissionStore.ts
import { PermissionsResult } from "@/lib/getPermissions";
import { create } from "zustand";

type PermissionStore = {
  // if you prefer, store them in a single "permissions" object
  permissions: PermissionsResult | null;
  setPermissions: (permissions: PermissionsResult) => void;
};

export const usePermissionStore = create<PermissionStore>((set) => ({
  permissions: null,
  setPermissions: (permissions) => set({ permissions }),
}));
