import { errorToast, successToast } from "@/lib/toast";
import { createPipelineAutomationRule } from "@/service/pipeline-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreatePipelineAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-pipeline-automation"],
    mutationFn: async (payload: any) =>
      await createPipelineAutomationRule(payload),
    onSuccess: () => {
      successToast("Pipeline automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-automation"] });
    },
    onError(error) {
      errorToast("Failed to create pipeline automation rule!");
      console.error(error);
    },
  });
};
