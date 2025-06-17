import { errorToast, successToast } from "@/lib/toast";
import { createCommunicationAutomationRule } from "@/service/communication-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateCommunicationAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-communication-automation"],
    mutationFn: async (payload: any) =>
      await createCommunicationAutomationRule(payload),
    onSuccess: () => {
      successToast("Communication automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["communication-automation"] });
    },
    onError(error) {
      errorToast("Field to create communication automation rule!");
      console.error(error);
    },
  });
};
