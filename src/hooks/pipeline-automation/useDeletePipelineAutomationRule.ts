import { errorToast, successToast } from "@/lib/toast";
import { deletePipelineAutomationRule } from "@/service/pipeline-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeletePipelineAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-pipeline-automation"],
    mutationFn: async (id: string) => await deletePipelineAutomationRule(id),
    onSuccess: () => {
      successToast("Pipeline automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete pipeline automation rule!");
      console.error(error);
    },
  });
};
