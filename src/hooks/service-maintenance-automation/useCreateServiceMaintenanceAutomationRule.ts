import { errorToast, successToast } from "@/lib/toast";
import { createServiceMaintenanceAutomationRule } from "@/service/service-maintenance-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateServiceMaintenanceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-service-maintenance-automation"],
    mutationFn: async (payload: any) =>
      await createServiceMaintenanceAutomationRule(payload),
    onSuccess: () => {
      successToast("ServiceMaintenance automation rule created successfully!");
      queryClient.invalidateQueries({
        queryKey: ["service-maintenance-automation"],
      });
    },
    onError(error) {
      errorToast("Field to create service-maintenance automation rule!");
      console.error(error);
    },
  });
};
