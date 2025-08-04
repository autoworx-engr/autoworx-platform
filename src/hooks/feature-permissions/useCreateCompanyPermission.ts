
import { errorToast, successToast } from "@/lib/toast";
import { createPermission } from "@/service/feature-permissions/api";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateCompanyPermission = (companyId:number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-feature-permission", companyId],
    mutationFn:  (payload: {permission_name: string; title:string, enabled: boolean}) =>
         createPermission(companyId,payload.permission_name, payload.title, payload.enabled),
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
