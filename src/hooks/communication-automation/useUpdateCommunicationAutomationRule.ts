import { errorToast, successToast } from "@/lib/toast";
import { updateCommunicationAutomationRule } from "@/service/communication-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateCommunicationAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-communication-automation"],
    mutationFn: ({
      id,
      data,
      companyId,
    }: {
      id: string;
      companyId: string;
      data: any;
    }) => updateCommunicationAutomationRule(id, companyId, data),
    onSuccess: () => {
      successToast("Communication automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["communication-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to update communication automation rule!");
      console.error(error);
    },
  });
};
