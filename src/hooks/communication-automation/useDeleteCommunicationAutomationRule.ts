import { errorToast, successToast } from "@/lib/toast";
import { deleteCommunicationAutomationRule } from "@/service/communication-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteCommunicationAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-communication-automation"],
    mutationFn: async (id: string) =>
      await deleteCommunicationAutomationRule(id),
    onSuccess: () => {
      successToast("Communication automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["communication-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete communication automation rule!");
      console.error(error);
    },
  });
};
