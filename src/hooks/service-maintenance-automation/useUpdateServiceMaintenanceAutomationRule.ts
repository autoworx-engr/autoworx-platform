import { errorToast, successToast } from "@/lib/toast";
import { updateServiceMaintenanceAutomationRule } from "@/service/service-maintenance-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateServiceMaintenanceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-service-maintenance-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateServiceMaintenanceAutomationRule(id, data),
    onSuccess: () => {
      successToast("Service Maintenance automation rule updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ["service-maintenance-automation"],
      });
    },
    onError: (error) => {
      errorToast("Failed to update service-maintenance automation rule!");
      console.error(error);
    },
  });
};
