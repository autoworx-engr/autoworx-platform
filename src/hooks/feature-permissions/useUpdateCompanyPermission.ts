import { errorToast, successToast } from "@/lib/toast";
import {
  updatePermission,
  bulkUpdatePermissions,
} from "@/service/feature-permissions/api";
import { PermissionUpdate } from "@/types/feature-permission";
import { useMutation } from "@tanstack/react-query";

export const useUpdateCompanyPermission = () => {
  return useMutation({
    mutationKey: ["updatePermission"],

    mutationFn: async (updates: PermissionUpdate[]) => {
      return await Promise.all(
        updates.map((u) =>
          updatePermission(u.companyId, u.permission_name, u.enabled),
        ),
      );
    },

    onSuccess: () => {
      successToast("Permissions updated successfully!");
    },
    onError: (error) => {
      errorToast("Failed to update permissions!");
      console.error("Update error:", error);
    },
  });
};

export const useBulkUpdatePermissions = () => {
  return useMutation({
    mutationKey: ["bulkUpdatePermissions"],

    mutationFn: async (payload: {
      companyId: number;
      permissions: Array<{
        permission_name: string;
        enabled: boolean;
      }>;
    }) => {
      return await bulkUpdatePermissions(
        payload.companyId,
        payload.permissions,
      );
    },

    onSuccess: () => {
      successToast("All permissions updated successfully!");
    },
    onError: (error) => {
      errorToast("Failed to update permissions!");
      console.error("Bulk update error:", error);
    },
  });
};
