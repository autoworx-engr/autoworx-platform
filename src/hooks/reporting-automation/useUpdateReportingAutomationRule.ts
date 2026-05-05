import { errorToast, successToast } from "@/lib/toast";
import { updateReportingAutomationRule } from "@/service/reporting-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateReportingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-reporting-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateReportingAutomationRule(id, data),
    onSuccess: () => {
      successToast("Reporting automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["reporting-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to update reporting automation rule!");
      console.error(error);
    },
  });
};
