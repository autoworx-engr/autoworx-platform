import { errorToast, successToast } from "@/lib/toast";
import { updatePipelineAutomationRule } from "@/service/pipeline-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdatePipelineAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-pipeline-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updatePipelineAutomationRule(id, data),
    onSuccess: () => {
      successToast("Pipeline automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-automation"] });
    },
    onError: (error) => {
      errorToast("Filed to update pipeline automation rule!");
      console.error(error);
    },
  });
};
