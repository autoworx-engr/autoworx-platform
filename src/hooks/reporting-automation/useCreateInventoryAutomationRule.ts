import { errorToast, successToast } from "@/lib/toast";
import { createReportingAutomationRule } from "@/service/reporting-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateReportingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-reporting-automation"],
    mutationFn: async (payload: any) =>
      await createReportingAutomationRule(payload),
    onSuccess: () => {
      successToast("Reporting automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["reporting-automation"] });
    },
    onError(error) {
      errorToast("Failed to create reporting automation rule!");
      console.error(error);
    },
  });
};
