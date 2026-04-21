import { errorToast, successToast } from "@/lib/toast";
import { createTagAutomationRule } from "@/service/tag-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateTagAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["tag-automation"],
    mutationFn: async (payload: any) => await createTagAutomationRule(payload),
    onSuccess: () => {
      successToast("Tag automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["tag-automation"] });
    },
    onError(error) {
      errorToast("Failed to create tag automation rule!");
      console.error(error);
    },
  });
};
