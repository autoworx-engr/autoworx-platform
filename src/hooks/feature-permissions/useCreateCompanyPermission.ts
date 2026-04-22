import { errorToast, successToast } from "@/lib/toast";
import { createPermission } from "@/service/feature-permissions/api";
import { PermissionCreate } from "@/types/feature-permission";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateCompanyPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-feature-permission"],
    mutationFn: async (payloads: PermissionCreate[]) => {
      return await Promise.all(
        payloads.map((p) =>
          createPermission(p.companyId, p.permission_name, p.title, p.enabled),
        ),
      );
    },
    onSuccess: () => {
      successToast("Feature permission  created successfully!");
      queryClient.invalidateQueries({ queryKey: ["companyPermissions"] });
    },
    onError(error) {
      errorToast("Failed to create permission automation!");
      console.error(error);
    },
  });
};
