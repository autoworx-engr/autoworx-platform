import { errorToast, successToast } from "@/lib/toast";
import { deleteMarketingAutomationRule } from "@/service/marketing-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteMarketingAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-marketing-automation"],
    mutationFn: async (id: string) => await deleteMarketingAutomationRule(id),
    onSuccess: () => {
      successToast("Marketing automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["marketing-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete marketing automation rule!");
      console.error(error);
    },
  });
};
