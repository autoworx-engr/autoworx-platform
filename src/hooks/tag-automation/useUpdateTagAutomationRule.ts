import { errorToast, successToast } from "@/lib/toast";
import { updateTagAutomationRule } from "@/service/tag-automation/api";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateTagAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-tag-automation"],
    mutationFn: ({
      id,
      data,
      companyId,
    }: {
      id: string;
      companyId: string;
      data: any;
    }) => updateTagAutomationRule(id, companyId, data),
    onSuccess: () => {
      successToast("Tag automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["tag-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to update tag automation rule!");
      console.error(error);
    },
  });
};
