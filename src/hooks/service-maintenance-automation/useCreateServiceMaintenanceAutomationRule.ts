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
      successToast("Service Maintenance automation rule created successfully!");
      queryClient.invalidateQueries({
        queryKey: ["service-maintenance-automation"],
      });
    },
    onError(error: any) {
      if (error?.response?.status == 406) {
        errorToast(
          "You can only create a maximum of 3 service automation rules per company!",
        );
      } else {
        errorToast("Failed to create service-maintenance automation rule!");
      }
    },
  });
};
