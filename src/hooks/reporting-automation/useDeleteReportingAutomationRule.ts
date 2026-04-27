import { errorToast, successToast } from "@/lib/toast";
import { deleteReportingAutomationRule } from "@/service/reporting-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteReportingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-reporting-automation"],
    mutationFn: async (id: string) => await deleteReportingAutomationRule(id),
    onSuccess: () => {
      successToast("Reporting automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["reporting-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete reporting automation rule!");
      console.error(error);
    },
  });
};
