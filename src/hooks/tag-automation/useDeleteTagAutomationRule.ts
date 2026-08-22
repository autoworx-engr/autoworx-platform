import { errorToast, successToast } from "@/lib/toast";
import { deleteTagAutomationRule } from "@/service/tag-automation/api";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteTagAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-tag-automation"],
    mutationFn: async (id: string) => await deleteTagAutomationRule(id),
    onSuccess: () => {
      successToast("Tag automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["tag-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete tag automation rule!");
      console.error(error);
    },
  });
};
