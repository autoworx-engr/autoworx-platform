import { errorToast, successToast } from "@/lib/toast";
import { updatePermission } from "@/service/feature-permissions/api";
import { PermissionUpdate } from "@/types/feature-permission";
import { useMutation } from "@tanstack/react-query";

export const useUpdateCompanyPermission = () => {
  return useMutation({
    mutationKey: ["updatePermission"],

    mutationFn: async (updates: PermissionUpdate[]) => {
      return await Promise.all(
        updates.map((u) =>
          updatePermission(u.companyId, u.permission_name, u.enabled)
        )
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
