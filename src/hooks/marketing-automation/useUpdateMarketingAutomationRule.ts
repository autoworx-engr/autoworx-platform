import { errorToast, successToast } from "@/lib/toast";
import { updateMarketingAutomationRule } from "@/service/marketing-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateMarketingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-marketing-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateMarketingAutomationRule(id, data),
    onSuccess: () => {
      successToast("Marketing automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["marketing-automation"] });
    },
    onError: (error: any) => {
      if (error?.response?.status == 417) {
        errorToast(
          "Please update the campaign start date and then resume the rule!",
        );
      } else {
        errorToast("Failed to update marketing automation rule!");
      }
    },
  });
};
