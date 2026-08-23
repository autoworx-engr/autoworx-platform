import { errorToast, successToast } from "@/lib/toast";
import { deleteServiceMaintenanceAutomationRule } from "@/service/service-maintenance-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteServiceMaintenanceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-service-maintenance-automation"],
    mutationFn: async (id: string) =>
      await deleteServiceMaintenanceAutomationRule(id),
    onSuccess: () => {
      successToast("Service Maintenance automation rule deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: ["service-maintenance-automation"],
      });
    },
    onError: (error) => {
      errorToast("Failed to delete service-maintenance automation rule!");
      console.error(error);
    },
  });
};
