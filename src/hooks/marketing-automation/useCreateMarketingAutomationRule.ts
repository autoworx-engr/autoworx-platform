import { errorToast, successToast } from "@/lib/toast";
import { createMarketingAutomationRule } from "@/service/marketing-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateMarketingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-marketing-automation"],
    mutationFn: async (payload: any) =>
      await createMarketingAutomationRule(payload),
    onSuccess: () => {
      successToast("Marketing automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["marketing-automation"] });
    },
    onError(error) {
      errorToast("Field to create marketing automation rule!");
      console.error(error);
    },
  });
};
